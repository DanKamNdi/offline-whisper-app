import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';
import { spawn } from 'child_process';

const REQUIRED_DLLS = [
  'vcruntime140.dll',
  'vcruntime140_1.dll',
  'msvcp140.dll',
  'concrt140.dll',
];

const DOWNLOAD_URL = 'https://aka.ms/vs/17/release/vc_redist.x64.exe';

let installPromise = null;

export async function ensureVisualCRuntime() {
  if (process.platform !== 'win32') {
    return;
  }

  const systemRoot = process.env.SystemRoot || 'C:\\\\Windows';
  const system32 = path.join(systemRoot, 'System32');
  const missing = REQUIRED_DLLS.filter((dll) => {
    const dllPath = path.join(system32, dll);
    return !fs.existsSync(dllPath);
  });

  if (!missing.length) {
    return;
  }

  if (installPromise) {
    return installPromise;
  }

  installPromise = (async () => {
    try {
      const tempDir = os.tmpdir();
      const installerPath = path.join(tempDir, 'vc_redist.x64.exe');
      await downloadFile(DOWNLOAD_URL, installerPath);
      await runInstaller(installerPath);
    } finally {
      installPromise = null;
    }
  })();

  return installPromise;
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    const request = https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlink(destination, () => {});
        downloadFile(response.headers.location, destination).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destination, () => {});
        reject(new Error(`Failed to download VC++ runtime (status ${response.statusCode})`));
        return;
      }

      response.pipe(file);
    });

    request.on('error', (err) => {
      file.close();
      fs.unlink(destination, () => {});
      reject(err);
    });

    file.on('finish', () => {
      file.close(resolve);
    });

    file.on('error', (err) => {
      file.close();
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

function runInstaller(installerPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(installerPath, ['/quiet', '/norestart'], {
      stdio: 'ignore',
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`VC++ installer exited with code ${code}`));
      }
    });
  });
}


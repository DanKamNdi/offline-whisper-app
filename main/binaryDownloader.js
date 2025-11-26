import fs from 'fs';
import path from 'path';
import https from 'https';
import { createUnzip } from 'zlib';
import { pipeline } from 'stream/promises';
import electron from 'electron';

const { app } = electron;

const WHISPER_VERSION = 'v1.8.2';
const MAX_REDIRECTS = 10;
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000; // 10 min for larger CUDA downloads

// Platform-specific binary configurations
const BINARY_CONFIG = {
  // CPU (OpenBLAS) versions
  'win32-x64-cpu': {
    url: `https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_VERSION}/whisper-blas-bin-x64.zip`,
    files: ['whisper-cli.exe'],
    executable: 'whisper-cli.exe',
    extractSubdir: 'Release',
    backend: 'cpu',
    size: '16 MB',
  },
  'win32-ia32-cpu': {
    url: `https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_VERSION}/whisper-blas-bin-Win32.zip`,
    files: ['whisper-cli.exe'],
    executable: 'whisper-cli.exe',
    extractSubdir: 'Release',
    backend: 'cpu',
    size: '10 MB',
  },
  // CUDA (NVIDIA GPU) versions - using CUDA 11.8 for wider compatibility
  'win32-x64-cuda': {
    url: `https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_VERSION}/whisper-cublas-11.8.0-bin-x64.zip`,
    files: ['whisper-cli.exe'],
    executable: 'whisper-cli.exe',
    extractSubdir: 'Release',
    backend: 'cuda',
    size: '56 MB',
    note: 'Requires NVIDIA GPU with CUDA 11.8+ drivers',
  },
  // macOS
  'darwin-x64-cpu': {
    url: null,
    files: ['whisper-cli'],
    executable: 'whisper-cli',
    note: 'macOS requires manual installation via Homebrew: brew install whisper-cpp',
    backend: 'cpu',
  },
  'darwin-arm64-metal': {
    url: null,
    files: ['whisper-cli'],
    executable: 'whisper-cli',
    note: 'macOS requires manual installation via Homebrew: brew install whisper-cpp',
    backend: 'metal',
  },
  // Linux
  'linux-x64-cpu': {
    url: null,
    files: ['whisper-cli'],
    executable: 'whisper-cli',
    note: 'Linux requires building from source or using package manager',
    backend: 'cpu',
  },
};

// Detected GPU info cache
let detectedGpu = null;

let customBinPath = null;

export function setBinPath(dirPath) {
  customBinPath = dirPath || null;
}

export function getBinPath() {
  if (customBinPath) return customBinPath;
  
  // Use app.isPackaged for reliable production detection
  if (!app.isPackaged) {
    return path.resolve(process.cwd(), 'resources', 'bin');
  }
  return path.join(app.getPath('userData'), 'bin');
}

export function getPlatformKey() {
  return `${process.platform}-${process.arch}`;
}

/**
 * Detect GPU and determine best backend
 */
export async function detectGpuBackend() {
  if (detectedGpu) return detectedGpu;
  
  try {
    const si = await import('systeminformation');
    const graphics = await si.default.graphics();
    const controller = graphics?.controllers?.[0];
    
    if (controller) {
      const name = (controller.model || controller.vendor || '').toLowerCase();
      const vram = controller.vram || controller.vramTotal || 0;
      
      // Check for NVIDIA GPU
      if (name.includes('nvidia') && process.platform === 'win32') {
        detectedGpu = { backend: 'cuda', name: controller.model, vramMB: vram };
        return detectedGpu;
      }
      
      // Check for Apple Silicon (Metal)
      if (process.platform === 'darwin') {
        detectedGpu = { backend: 'metal', name: controller.model || 'Apple GPU', vramMB: vram };
        return detectedGpu;
      }
    }
  } catch (err) {
    console.log('GPU detection failed, defaulting to CPU:', err.message);
  }
  
  detectedGpu = { backend: 'cpu', name: 'CPU', vramMB: 0 };
  return detectedGpu;
}

/**
 * Get the best binary config for current platform and GPU
 */
export async function getBinaryConfig(preferredBackend = null) {
  const platform = process.platform;
  const arch = process.arch;
  
  // Detect GPU if no preference given
  let backend = preferredBackend;
  if (!backend) {
    const gpu = await detectGpuBackend();
    backend = gpu.backend;
  }
  
  // Try to find config for detected backend
  let key = `${platform}-${arch}-${backend}`;
  let config = BINARY_CONFIG[key];
  
  // Fall back to CPU if specific backend not available
  if (!config || !config.url) {
    key = `${platform}-${arch}-cpu`;
    config = BINARY_CONFIG[key];
  }
  
  return config || null;
}

/**
 * Get available backends for current platform
 */
export function getAvailableBackends() {
  const platform = process.platform;
  const arch = process.arch;
  const backends = [];
  
  Object.entries(BINARY_CONFIG).forEach(([key, config]) => {
    if (key.startsWith(`${platform}-${arch}-`) && config.url) {
      backends.push({
        backend: config.backend,
        size: config.size,
        note: config.note,
      });
    }
  });
  
  return backends;
}

export async function getExecutablePath() {
  const config = await getBinaryConfig();
  if (!config) return null;
  return path.join(getBinPath(), config.executable);
}

/**
 * Check if whisper binaries are installed and functional
 */
export async function areBinariesInstalled() {
  const config = await getBinaryConfig();
  if (!config) return { installed: false, reason: 'Unsupported platform' };

  const binPath = getBinPath();
  
  try {
    // Check all required files exist
    for (const file of config.files) {
      const filePath = path.join(binPath, file);
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile() || stat.size === 0) {
        return { installed: false, reason: `Missing or empty: ${file}` };
      }
    }
    return { installed: true, backend: config.backend };
  } catch (err) {
    return { installed: false, reason: 'Binary files not found' };
  }
}

/**
 * Get binary status including platform info and GPU detection
 */
export async function getBinaryStatus() {
  const config = await getBinaryConfig();
  const platformKey = getPlatformKey();
  const gpu = await detectGpuBackend();
  const { installed, reason, backend: installedBackend } = await areBinariesInstalled();
  const availableBackends = getAvailableBackends();
  
  return {
    platform: platformKey,
    supported: !!config?.url,
    installed,
    installedBackend: installedBackend || null,
    reason: reason || '',
    binPath: getBinPath(),
    downloadUrl: config?.url || null,
    note: config?.note || null,
    version: WHISPER_VERSION,
    // GPU info
    gpu: gpu,
    recommendedBackend: gpu.backend,
    availableBackends,
    downloadSize: config?.size || 'Unknown',
  };
}

/**
 * Download and install whisper binaries
 * @param {Function} onProgress - Progress callback
 * @param {string} preferredBackend - 'cpu', 'cuda', or 'metal' (auto-detect if not specified)
 */
export async function downloadBinaries(onProgress, preferredBackend = null) {
  const config = await getBinaryConfig(preferredBackend);
  if (!config) {
    throw new Error(`Unsupported platform: ${getPlatformKey()}`);
  }
  
  if (!config.url) {
    throw new Error(config.note || 'No pre-built binaries available for this platform');
  }

  const binPath = getBinPath();
  
  // Clear existing binaries when switching backends
  try {
    await fs.promises.rm(binPath, { recursive: true, force: true });
  } catch (err) {
    // Ignore errors
  }
  
  await fs.promises.mkdir(binPath, { recursive: true });

  const zipPath = path.join(binPath, 'whisper-bin.zip');
  
  try {
    // Download the zip file
    if (onProgress) {
      onProgress({ stage: 'downloading', backend: config.backend, size: config.size });
    }
    await downloadFile(config.url, zipPath, onProgress);
    
    // Extract the zip file
    if (onProgress) {
      onProgress({ stage: 'extracting', percent: null });
    }
    await extractZip(zipPath, binPath, config.extractSubdir);
    
    // Verify installation
    const { installed, reason } = await areBinariesInstalled();
    if (!installed) {
      throw new Error(`Installation verification failed: ${reason}`);
    }

    // Make executable on Unix systems
    if (process.platform !== 'win32') {
      const execPath = await getExecutablePath();
      if (execPath) {
        await fs.promises.chmod(execPath, 0o755);
      }
    }

    return { success: true, binPath, backend: config.backend };
  } finally {
    // Clean up zip file
    await fs.promises.rm(zipPath, { force: true }).catch(() => {});
  }
}

/**
 * Download a file with redirect support and progress tracking
 */
function downloadFile(url, destPath, onProgress, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      reject(new Error('Too many redirects'));
      return;
    }

    const request = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: '*/*',
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          const nextUrl = new URL(res.headers.location, url).toString();
          downloadFile(nextUrl, destPath, onProgress, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }

        const contentLength = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;
        const fileStream = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (onProgress) {
            const percent = contentLength
              ? Math.min(100, Math.round((receivedBytes / contentLength) * 100))
              : null;
            onProgress({
              stage: 'downloading',
              received: receivedBytes,
              total: contentLength,
              percent,
            });
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            if (receivedBytes === 0) {
              fs.promises.rm(destPath, { force: true }).catch(() => {});
              reject(new Error('Download completed but no data received'));
              return;
            }
            resolve();
          });
        });

        res.on('error', (err) => {
          fileStream.destroy();
          fs.promises.rm(destPath, { force: true }).catch(() => {});
          reject(err);
        });

        fileStream.on('error', (err) => {
          res.destroy();
          fs.promises.rm(destPath, { force: true }).catch(() => {});
          reject(err);
        });
      }
    );

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timed out'));
    });

    request.on('error', reject);
  });
}

/**
 * Extract a zip file using the unzipper approach with native Node.js
 * For Windows, we'll use PowerShell; for Unix, we'll use the unzip command
 */
async function extractZip(zipPath, destPath, extractSubdir) {
  const { spawn } = await import('child_process');
  
  return new Promise((resolve, reject) => {
    let child;
    
    if (process.platform === 'win32') {
      // Use PowerShell to extract on Windows
      const script = `
        $ErrorActionPreference = 'Stop'
        Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destPath.replace(/'/g, "''")}' -Force
      `;
      child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
        windowsHide: true,
      });
    } else {
      // Use unzip command on Unix
      child = spawn('unzip', ['-o', zipPath, '-d', destPath]);
    }

    let stderr = '';
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Extraction failed (code ${code}): ${stderr}`));
        return;
      }

      // Move files from subdirectory if needed
      if (extractSubdir) {
        const subdir = path.join(destPath, extractSubdir);
        try {
          const files = await fs.promises.readdir(subdir);
          for (const file of files) {
            const src = path.join(subdir, file);
            const dest = path.join(destPath, file);
            await fs.promises.rename(src, dest).catch(async () => {
              // If rename fails (cross-device), copy and delete
              await fs.promises.copyFile(src, dest);
              await fs.promises.rm(src, { force: true });
            });
          }
          await fs.promises.rmdir(subdir).catch(() => {});
        } catch (err) {
          // Subdirectory might not exist, that's okay
        }
      }

      resolve();
    });

    child.on('error', reject);
  });
}

/**
 * Remove installed binaries
 */
export async function removeBinaries() {
  const binPath = getBinPath();
  const config = getBinaryConfig();
  
  if (!config) return;

  for (const file of config.files) {
    await fs.promises.rm(path.join(binPath, file), { force: true }).catch(() => {});
  }
}


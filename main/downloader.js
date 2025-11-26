import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import electron from 'electron';
import { MODEL_FILES, MODEL_INFO, MODEL_LIST, MODEL_URLS } from './models.js';

const { app } = electron;

const MIN_SIZE_RATIO = 0.5;
const RETRY_LIMIT = 2;
const MAX_REDIRECTS = 10;
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for large models
let customModelsRoot = null;

export function setModelsRoot(dirPath) {
  customModelsRoot = dirPath || null;
}

export function getModelsRoot() {
  return customModelsRoot || path.join(app.getPath('userData'), 'models');
}

export function getModelDir(modelName) {
  return path.join(getModelsRoot(), modelName);
}

export function getModelPath(modelName) {
  return path.join(getModelDir(modelName), MODEL_FILES[modelName]);
}

export async function isModelInstalled(modelName) {
  try {
    const stat = await fs.promises.stat(getModelPath(modelName));
    return stat.isFile() && stat.size > 0;
  } catch (err) {
    return false;
  }
}

export async function listInstalledModels() {
  const installed = {};
  await Promise.all(
    MODEL_LIST.map(async (name) => {
      installed[name] = {
        installed: await isModelInstalled(name),
        path: getModelPath(name),
      };
    })
  );
  return installed;
}

export async function removeModel(modelName) {
  const dir = getModelDir(modelName);
  await fs.promises.rm(dir, { recursive: true, force: true });
}

export async function downloadAndCacheModel(modelName, onProgress) {
  const destDir = getModelDir(modelName);
  const destPath = getModelPath(modelName);
  const url = MODEL_URLS[modelName];
  if (!url) throw new Error(`Unknown model ${modelName}`);

  await fs.promises.mkdir(destDir, { recursive: true });
  if (await isModelInstalled(modelName)) {
    return destPath;
  }

  let attempts = 0;
  let lastError;
  while (attempts < RETRY_LIMIT) {
    attempts += 1;
    try {
      await fs.promises.rm(destPath, { force: true });
      await downloadFile(url, destPath, modelName, onProgress);
      await verifyDownload(destPath, MODEL_INFO[modelName]?.downloadSizeMB);
      return destPath;
    } catch (err) {
      lastError = err;
      await fs.promises.rm(destPath, { force: true });
      if (attempts >= RETRY_LIMIT) break;
    }
  }
  throw lastError || new Error('Download failed after retries');
}

/**
 * Downloads a file from a URL, following redirects.
 */
function downloadFile(url, destPath, modelName, onProgress, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      reject(new Error('Too many redirects while downloading'));
      return;
    }

    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const request = protocol.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: '*/*',
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        // Handle redirects (301, 302, 303, 307, 308)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume(); // Consume the response body to free up memory
          const nextUrl = new URL(res.headers.location, url).toString();
          downloadFile(nextUrl, destPath, modelName, onProgress, redirectCount + 1)
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
        if (contentLength === 0) {
          res.resume();
          reject(new Error('Server returned empty content-length. The file may not exist.'));
          return;
        }

        let receivedBytes = 0;
        const fileStream = fs.createWriteStream(destPath);

        // Track progress
        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (onProgress) {
            const percent = contentLength
              ? Math.min(100, Math.round((receivedBytes / contentLength) * 100))
              : null;
            onProgress({
              model: modelName,
              received: receivedBytes,
              total: contentLength,
              percent,
            });
          }
        });

        // Pipe response to file
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            // Verify we actually received data
            if (receivedBytes === 0) {
              fs.promises.rm(destPath, { force: true }).catch(() => {});
              reject(new Error('Download completed but no data was received'));
              return;
            }
            resolve();
          });
        });

        res.on('error', (err) => {
          fileStream.destroy();
          fs.promises.rm(destPath, { force: true }).catch(() => {});
          reject(new Error(`Download stream error: ${err.message}`));
        });

        fileStream.on('error', (err) => {
          res.destroy();
          fs.promises.rm(destPath, { force: true }).catch(() => {});
          reject(new Error(`File write error: ${err.message}`));
        });
      }
    );

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timed out'));
    });

    request.on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });
  });
}

/**
 * Verifies the downloaded file meets size expectations.
 */
async function verifyDownload(filePath, expectedMB) {
  let stat;
  try {
    stat = await fs.promises.stat(filePath);
  } catch (err) {
    throw new Error('Downloaded file not found');
  }

  if (!stat.size || stat.size === 0) {
    throw new Error('Downloaded file is empty (0 bytes)');
  }

  if (expectedMB) {
    const expectedBytes = expectedMB * 1024 * 1024;
    if (stat.size < expectedBytes * MIN_SIZE_RATIO) {
      const actualMB = (stat.size / 1024 / 1024).toFixed(1);
      throw new Error(
        `Downloaded file size (${actualMB} MB) is much smaller than expected (~${expectedMB} MB). Download may be incomplete.`
      );
    }
  }
}

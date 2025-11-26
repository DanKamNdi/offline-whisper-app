import fs from 'fs';
import path from 'path';
import electron from 'electron';
import { IPC_CHANNELS } from '../shared/ipcChannels.js';
import { probeCapabilities } from './capabilities.js';
import { getModelSupport, pickBestModel } from './models.js';
import {
  downloadAndCacheModel,
  getModelPath,
  isModelInstalled,
  listInstalledModels,
  removeModel,
  setModelsRoot,
  getModelsRoot,
} from './downloader.js';
import {
  getBinaryStatus,
  downloadBinaries,
  areBinariesInstalled,
} from './binaryDownloader.js';
import { runWhisper } from './whisperRunner.js';
import { loadConfig, saveConfig } from './config.js';
import {
  loadHistory,
  addHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
  getHistoryStats,
} from './history.js';

const { app, ipcMain, dialog } = electron;

let cachedConfig = null;

async function getConfig() {
  if (!cachedConfig) {
    cachedConfig = await loadConfig();
    if (cachedConfig.modelsPath) {
      setModelsRoot(cachedConfig.modelsPath);
    }
  }
  return cachedConfig;
}

async function updateConfig(partial) {
  const merged = { ...(await getConfig()), ...partial };
  cachedConfig = merged;
  await saveConfig(merged);
  return merged;
}

export function registerIpc(getWindow) {
  ipcMain.handle(IPC_CHANNELS.CAPABILITIES_REQUEST, async () => {
    const capabilities = await probeCapabilities();
    const supportTable = getModelSupport(capabilities);
    const recommendedModel = pickBestModel(supportTable);
    const config = await getConfig();
    if (!config.selectedModel) {
      await updateConfig({ selectedModel: recommendedModel });
    }
    return {
      capabilities,
      supportTable,
      recommendedModel,
      selectedModel: cachedConfig.selectedModel || recommendedModel,
      installed: await listInstalledModels(),
      modelsPath: config.modelsPath || getModelsRoot(),
    };
  });

  ipcMain.handle(IPC_CHANNELS.MODELS_LIST, async () => {
    const capabilities = await probeCapabilities();
    const supportTable = getModelSupport(capabilities);
    const recommendedModel = pickBestModel(supportTable);
    const config = await getConfig();
    return {
      supportTable,
      recommendedModel,
      selectedModel: config.selectedModel || recommendedModel,
      installed: await listInstalledModels(),
      modelsPath: config.modelsPath || getModelsRoot(),
    };
  });

  ipcMain.handle(IPC_CHANNELS.MODEL_SELECT, async (_event, { modelName }) => {
    const config = await updateConfig({ selectedModel: modelName });
    return config;
  });

  ipcMain.handle(IPC_CHANNELS.MODEL_DOWNLOAD, async (_event, { modelName }) => {
    const win = getWindow?.();
    const onProgress = (data) => {
      win?.webContents.send(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, data);
    };
    const modelPath = await downloadAndCacheModel(modelName, onProgress);
    return { modelPath };
  });

  ipcMain.handle(IPC_CHANNELS.MODEL_DELETE, async (_event, { modelName }) => {
    await removeModel(modelName);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.MODELS_CHOOSE_PATH, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select models folder',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: getModelsRoot(),
    });
    if (result.canceled || !result.filePaths?.length) {
      return { canceled: true };
    }
    const selected = result.filePaths[0];
    setModelsRoot(selected);
    await updateConfig({ modelsPath: selected });
    return { modelsPath: selected };
  });

  ipcMain.handle(IPC_CHANNELS.TRANSCRIBE_START, async (_event, { audioData, audioDurationMs }) => {
    if (!audioData) throw new Error('Missing audio data');
    
    // Check binaries first
    const { installed: binariesInstalled } = await areBinariesInstalled();
    if (!binariesInstalled) {
      throw new Error('Whisper binaries not installed. Please download them first.');
    }
    
    const buffer = Buffer.from(audioData);
    const tempPath = path.join(app.getPath('temp'), `whisper-${Date.now()}.wav`);
    await fs.promises.writeFile(tempPath, buffer);

    const startTime = Date.now();
    const win = getWindow?.();
    
    try {
      const { selectedModel } = await getConfig();
      if (!selectedModel) throw new Error('No model selected');
      if (!(await isModelInstalled(selectedModel))) {
        throw new Error('Selected model is not installed');
      }
      const modelPath = getModelPath(selectedModel);
      
      // Progress callback to stream transcription
      const onProgress = (data) => {
        win?.webContents.send(IPC_CHANNELS.TRANSCRIBE_PROGRESS, {
          ...data,
          elapsedMs: Date.now() - startTime,
        });
      };
      
      const transcript = await runWhisper({ modelPath, audioPath: tempPath, onProgress });
      const elapsedMs = Date.now() - startTime;
      
      // Log to history
      await addHistoryEntry({
        model: selectedModel,
        audioDurationMs: audioDurationMs || 0,
        transcriptionTimeMs: elapsedMs,
        transcript,
      });
      
      return { transcript, elapsedMs };
    } finally {
      fs.promises.rm(tempPath, { force: true }).catch(() => {});
    }
  });

  // Binary management handlers
  ipcMain.handle(IPC_CHANNELS.BINARY_STATUS, async () => {
    return getBinaryStatus();
  });

  ipcMain.handle(IPC_CHANNELS.BINARY_DOWNLOAD, async (_event, { backend } = {}) => {
    const win = getWindow?.();
    const onProgress = (data) => {
      win?.webContents.send(IPC_CHANNELS.BINARY_DOWNLOAD_PROGRESS, data);
    };
    await downloadBinaries(onProgress, backend);
    return getBinaryStatus();
  });

  // History handlers
  ipcMain.handle(IPC_CHANNELS.HISTORY_GET, async () => {
    return loadHistory();
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE, async (_event, { id }) => {
    return deleteHistoryEntry(id);
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, async () => {
    return clearHistory();
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_STATS, async () => {
    return getHistoryStats();
  });
}

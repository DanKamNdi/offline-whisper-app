const path = require('path');
const { contextBridge, ipcRenderer, clipboard } = require('electron');
const { IPC_CHANNELS } = require(path.join(__dirname, '..', 'shared', 'ipcChannels.cjs'));

contextBridge.exposeInMainWorld('api', {
  getCapabilities: () => ipcRenderer.invoke(IPC_CHANNELS.CAPABILITIES_REQUEST),
  listModels: () => ipcRenderer.invoke(IPC_CHANNELS.MODELS_LIST),
  selectModel: (modelName) => ipcRenderer.invoke(IPC_CHANNELS.MODEL_SELECT, { modelName }),
  chooseModelsPath: () => ipcRenderer.invoke(IPC_CHANNELS.MODELS_CHOOSE_PATH),
  downloadModel: (modelName) => ipcRenderer.invoke(IPC_CHANNELS.MODEL_DOWNLOAD, { modelName }),
  deleteModel: (modelName) => ipcRenderer.invoke(IPC_CHANNELS.MODEL_DELETE, { modelName }),
  onModelDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, handler);
  },
  startTranscription: (audioBuffer, audioDurationMs) =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIBE_START, { audioData: audioBuffer, audioDurationMs }),
  onTranscribeProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.TRANSCRIBE_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRANSCRIBE_PROGRESS, handler);
  },
  writeClipboard: (text) => clipboard.writeText(text),
  
  // History management
  getHistory: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET),
  deleteHistoryEntry: (id) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_DELETE, { id }),
  clearHistory: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_CLEAR),
  getHistoryStats: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_STATS),
  
  // Binary management
  getBinaryStatus: () => ipcRenderer.invoke(IPC_CHANNELS.BINARY_STATUS),
  downloadBinaries: (backend) => ipcRenderer.invoke(IPC_CHANNELS.BINARY_DOWNLOAD, { backend }),
  onBinaryDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.BINARY_DOWNLOAD_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.BINARY_DOWNLOAD_PROGRESS, handler);
  },
});

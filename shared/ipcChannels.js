export const IPC_CHANNELS = {
  CAPABILITIES_REQUEST: 'capabilities:request',
  MODELS_LIST: 'models:list',
  MODEL_SELECT: 'models:select',
  MODELS_CHOOSE_PATH: 'models:choose-path',
  MODEL_DOWNLOAD: 'models:download',
  MODEL_DELETE: 'models:delete',
  MODEL_DOWNLOAD_PROGRESS: 'models:download:progress',
  TRANSCRIBE_START: 'transcribe:start',
  TRANSCRIBE_PROGRESS: 'transcribe:progress',
  // Binary management
  BINARY_STATUS: 'binary:status',
  BINARY_DOWNLOAD: 'binary:download',
  BINARY_DOWNLOAD_PROGRESS: 'binary:download:progress',
  // History management
  HISTORY_GET: 'history:get',
  HISTORY_DELETE: 'history:delete',
  HISTORY_CLEAR: 'history:clear',
  HISTORY_STATS: 'history:stats',
};

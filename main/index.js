import electron from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIpc } from './ipc.js';

const { app, BrowserWindow, nativeTheme } = electron;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use app.isPackaged instead of NODE_ENV for reliable detection
const isDev = !app.isPackaged;
const rendererDevServerUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  nativeTheme.themeSource = 'light';
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    mainWindow.webContents.on('console-message', (_event, level, message) => {
      // Surface renderer console logs to Node console for easier debugging.
      // eslint-disable-next-line no-console
      console.log(`[renderer][${level}] ${message}`);
    });
  }

  if (isDev) {
    mainWindow.loadURL(rendererDevServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/renderer/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  createWindow();
  registerIpc(() => mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

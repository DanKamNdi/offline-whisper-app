import fs from 'fs';
import path from 'path';
import electron from 'electron';

const defaultConfig = {
  selectedModel: null,
  modelsPath: null,
};

const { app } = electron;

export function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

export async function loadConfig() {
  const configPath = getConfigPath();
  try {
    const raw = await fs.promises.readFile(configPath, 'utf-8');
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch (err) {
    return { ...defaultConfig };
  }
}

export async function saveConfig(config) {
  const configPath = getConfigPath();
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
  await fs.promises.writeFile(configPath, JSON.stringify({ ...defaultConfig, ...config }, null, 2), 'utf-8');
}

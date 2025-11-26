import os from 'os';
import si from 'systeminformation';

const bytesToGB = (bytes) => Math.round((bytes / 1024 / 1024 / 1024) * 10) / 10;
const mbToGB = (mb) => Math.round((mb / 1024) * 10) / 10;

export async function probeCapabilities() {
  const ramGB = bytesToGB(os.totalmem());
  const logicalCores = (os.cpus() || []).length;
  const arch = os.arch();

  let gpu = { name: 'Unknown', vramGB: 0, backend: 'cpu' };

  try {
    const graphics = await si.graphics();
    const controller = graphics?.controllers?.[0];
    if (controller) {
      const vramGB = mbToGB(controller.vram || controller.vramTotal || 0);
      const name = controller.model || controller.vendor || 'Unknown GPU';
      gpu = { name, vramGB, backend: detectBackend(name, vramGB) };
    } else if (process.platform === 'darwin') {
      gpu.backend = 'metal';
    }
  } catch (err) {
    // fall back to defaults if detection fails
    gpu = { name: 'Unknown', vramGB: 0, backend: 'cpu' };
  }

  return { ramGB, logicalCores, arch, gpu };
}

function detectBackend(name, vramGB) {
  const normalized = (name || '').toLowerCase();
  if (process.platform === 'darwin') {
    return 'metal';
  }
  if (normalized.includes('nvidia') && (process.platform === 'win32' || process.platform === 'linux')) {
    return 'cuda';
  }
  if (vramGB > 0 && normalized) {
    return 'cpu';
  }
  return 'cpu';
}

export const MODEL_LIST = ['tiny', 'base', 'small', 'medium', 'large-v3'];

// Sizes for quantized models from whisper.cpp HuggingFace repo
// tiny/base/small use q5_1, medium/large use q5_0
export const MODEL_INFO = {
  tiny: {
    downloadSizeMB: 32,
    estimatedRuntimeMemoryGB: 0.4,
    estimatedSpeedClass: 'very-fast',
  },
  base: {
    downloadSizeMB: 60,
    estimatedRuntimeMemoryGB: 0.5,
    estimatedSpeedClass: 'fast',
  },
  small: {
    downloadSizeMB: 190,
    estimatedRuntimeMemoryGB: 1.0,
    estimatedSpeedClass: 'ok',
  },
  medium: {
    downloadSizeMB: 539,
    estimatedRuntimeMemoryGB: 2.0,
    estimatedSpeedClass: 'slow',
  },
  'large-v3': {
    downloadSizeMB: 1080,
    estimatedRuntimeMemoryGB: 4.0,
    estimatedSpeedClass: 'slow',
  },
};

export const MODEL_FILES = {
  tiny: 'ggml-tiny-q5_1.bin',
  base: 'ggml-base-q5_1.bin',
  small: 'ggml-small-q5_1.bin',
  medium: 'ggml-medium-q5_0.bin',
  'large-v3': 'ggml-large-v3-q5_0.bin',
};

export const MODEL_URLS = {
  tiny: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILES.tiny}?download=1`,
  base: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILES.base}?download=1`,
  small: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILES.small}?download=1`,
  medium: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILES.medium}?download=1`,
  'large-v3': `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILES['large-v3']}?download=1`,
};

/**
 * Compute support for each model based on hardware capabilities.
 * Rules are intentionally explicit and easy to tweak.
 */
export function getModelSupport(capabilities) {
  const table = {};
  MODEL_LIST.forEach((name) => {
    const info = MODEL_INFO[name];
    table[name] = {
      supported: false,
      reason: '',
      recommendedVariant: 'q5',
      estimatedRuntimeMemoryGB: info.estimatedRuntimeMemoryGB,
      estimatedSpeedClass: info.estimatedSpeedClass,
      downloadSizeMB: info.downloadSizeMB,
    };
  });

  const fallback = !capabilities || typeof capabilities.ramGB !== 'number' || typeof capabilities.logicalCores !== 'number';
  const ramGB = capabilities?.ramGB || 0;
  const cores = capabilities?.logicalCores || 0;
  const backend = capabilities?.gpu?.backend || 'cpu';
  const vram = capabilities?.gpu?.vramGB || 0;

  // Detection failure fallback: assume CPU, enable up to small, default small
  if (fallback) {
    enableRange(table, 'small');
    disableLargeCpu(table);
    return table;
  }

  // GPU path: allow larger models if VRAM and backend permit
  if (backend !== 'cpu' && vram >= 4) {
    if (vram >= 8) {
      enableRange(table, 'large-v3');
    } else {
      enableRange(table, 'medium');
      table['large-v3'].reason = 'Requires >=8GB VRAM.';
    }
    return table;
  }

  // CPU-only path
  if (ramGB < 6 || cores <= 4) {
    enableRange(table, 'base');
    table.small.reason = 'Needs more RAM/cores.';
    table.medium.reason = 'Needs more RAM/cores.';
    table['large-v3'].reason = 'Too slow on CPU.';
    return table;
  }

  if (ramGB >= 6 && ramGB < 12 && cores >= 4) {
    enableRange(table, 'small');
    table.medium.reason = 'Needs more RAM/cores.';
    table['large-v3'].reason = 'Too slow on CPU.';
    return table;
  }

  if (ramGB >= 12 && cores >= 6) {
    enableRange(table, 'medium');
    if (ramGB >= 24 && cores >= 12) {
      table['large-v3'].supported = true;
    } else {
      table['large-v3'].reason = 'Too slow on CPU.';
    }
    return table;
  }

  // Safety net: if none matched, allow small
  enableRange(table, 'small');
  table.medium.reason = 'Needs more RAM/cores.';
  table['large-v3'].reason = 'Too slow on CPU.';
  return table;
}

function enableRange(table, maxModel) {
  const maxIndex = MODEL_LIST.indexOf(maxModel);
  MODEL_LIST.forEach((name, idx) => {
    if (idx <= maxIndex) {
      table[name].supported = true;
      table[name].reason = '';
    } else if (name === 'large-v3') {
      table[name].reason ||= 'Too slow on CPU.';
    } else {
      table[name].reason ||= 'Needs more RAM/cores.';
    }
  });
}

function disableLargeCpu(table) {
  table['large-v3'].supported = false;
  table['large-v3'].reason = 'Too slow on CPU.';
}

export function pickBestModel(supportTable) {
  const supported = MODEL_LIST.filter((name) => supportTable?.[name]?.supported);
  if (!supported.length) {
    return 'small';
  }
  return supported[supported.length - 1];
}

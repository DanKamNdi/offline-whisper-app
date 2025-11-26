import fs from 'fs';
import path from 'path';
import electron from 'electron';

const { app } = electron;

const MAX_HISTORY_ENTRIES = 100;

function getHistoryPath() {
  // In development, store in project folder; in production, use app data
  if (!app.isPackaged) {
    return path.resolve(process.cwd(), 'transcription-history.json');
  }
  return path.join(app.getPath('userData'), 'transcription-history.json');
}

/**
 * Load transcription history from disk
 */
export async function loadHistory() {
  try {
    const raw = await fs.promises.readFile(getHistoryPath(), 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

/**
 * Save transcription history to disk
 */
async function saveHistory(history) {
  const historyPath = getHistoryPath();
  await fs.promises.mkdir(path.dirname(historyPath), { recursive: true });
  await fs.promises.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');
}

/**
 * Add a new transcription entry to history
 */
export async function addHistoryEntry(entry) {
  const history = await loadHistory();
  
  // Convert ms to seconds with 3 decimal places
  const audioDurationSeconds = entry.audioDurationMs 
    ? Number((entry.audioDurationMs / 1000).toFixed(3)) 
    : 0;
  const transcriptionTimeSeconds = entry.transcriptionTimeMs 
    ? Number((entry.transcriptionTimeMs / 1000).toFixed(3)) 
    : 0;
  
  const newEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    model: entry.model || 'unknown',
    audioDurationSeconds,
    transcriptionTimeSeconds,
    transcript: entry.transcript || '',
    wordCount: (entry.transcript || '').split(/\s+/).filter(Boolean).length,
  };
  
  // Add to beginning (newest first)
  history.unshift(newEntry);
  
  // Limit history size
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.length = MAX_HISTORY_ENTRIES;
  }
  
  await saveHistory(history);
  return newEntry;
}

/**
 * Delete a history entry by ID
 */
export async function deleteHistoryEntry(id) {
  const history = await loadHistory();
  const filtered = history.filter((entry) => entry.id !== id);
  await saveHistory(filtered);
  return filtered;
}

/**
 * Clear all history
 */
export async function clearHistory() {
  await saveHistory([]);
  return [];
}

/**
 * Get history statistics
 */
export async function getHistoryStats() {
  const history = await loadHistory();
  
  if (history.length === 0) {
    return {
      totalTranscriptions: 0,
      totalAudioDurationSeconds: 0,
      totalTranscriptionTimeSeconds: 0,
      totalWords: 0,
      averageSpeedRatio: 0,
      modelUsage: {},
    };
  }
  
  const totalAudioDurationSeconds = history.reduce((sum, e) => sum + (e.audioDurationSeconds || 0), 0);
  const totalTranscriptionTimeSeconds = history.reduce((sum, e) => sum + (e.transcriptionTimeSeconds || 0), 0);
  const totalWords = history.reduce((sum, e) => sum + (e.wordCount || 0), 0);
  
  // Count model usage
  const modelUsage = {};
  history.forEach((e) => {
    modelUsage[e.model] = (modelUsage[e.model] || 0) + 1;
  });
  
  return {
    totalTranscriptions: history.length,
    totalAudioDurationSeconds,
    totalTranscriptionTimeSeconds,
    totalWords,
    averageSpeedRatio: totalAudioDurationSeconds > 0 
      ? Number((totalTranscriptionTimeSeconds / totalAudioDurationSeconds).toFixed(2))
      : 0,
    modelUsage,
  };
}


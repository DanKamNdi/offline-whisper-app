import React, { useEffect, useState } from 'react';

export default function HistoryModal({ isOpen, onClose, api }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && api) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        api.getHistory(),
        api.getHistoryStats(),
      ]);
      setHistory(historyData || []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!api) return;
    try {
      const updated = await api.deleteHistoryEntry(id);
      setHistory(updated);
      const newStats = await api.getHistoryStats();
      setStats(newStats);
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const handleClearAll = async () => {
    if (!api) return;
    if (!confirm('Are you sure you want to clear all history?')) return;
    try {
      await api.clearHistory();
      setHistory([]);
      const newStats = await api.getHistoryStats();
      setStats(newStats);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const copyToClipboard = (text) => {
    api?.writeClipboard(text);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal history-modal">
        <div className="modal-head">
          <div>
            <h3>Transcription History</h3>
            <p className="sub">Your past transcriptions with timing data</p>
          </div>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>

        {stats && stats.totalTranscriptions > 0 && (
          <div className="history-stats">
            <div className="stat">
              <span className="stat-value">{stats.totalTranscriptions}</span>
              <span className="stat-label">Transcriptions</span>
            </div>
            <div className="stat">
              <span className="stat-value">{formatSeconds(stats.totalAudioDurationSeconds)}</span>
              <span className="stat-label">Total Audio</span>
            </div>
            <div className="stat">
              <span className="stat-value">{formatSeconds(stats.totalTranscriptionTimeSeconds)}</span>
              <span className="stat-label">Processing Time</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.totalWords.toLocaleString()}</span>
              <span className="stat-label">Words</span>
            </div>
          </div>
        )}

        <div className="history-list">
          {loading ? (
            <div className="history-empty">Loading...</div>
          ) : history.length === 0 ? (
            <div className="history-empty">
              <p>No transcriptions yet.</p>
              <p className="sub">Your transcription history will appear here.</p>
            </div>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="history-entry">
                <div className="history-entry-header">
                  <div className="history-meta">
                    <span className="history-model">{entry.model}</span>
                    <span className="history-date">{formatDate(entry.timestamp)}</span>
                  </div>
                  <div className="history-timing">
                    <span title="Audio duration">🎤 {entry.audioDurationSeconds.toFixed(1)}s</span>
                    <span title="Processing time">⚡ {entry.transcriptionTimeSeconds.toFixed(1)}s</span>
                    <span title="Word count">📝 {entry.wordCount} words</span>
                  </div>
                </div>
                <div className="history-transcript">{entry.transcript || '(empty)'}</div>
                <div className="history-actions">
                  <button 
                    className="ghost small" 
                    onClick={() => copyToClipboard(entry.transcript)}
                    title="Copy transcript"
                  >
                    Copy
                  </button>
                  <button 
                    className="ghost small danger" 
                    onClick={() => handleDelete(entry.id)}
                    title="Delete entry"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <div className="history-footer">
            <button className="ghost danger" onClick={handleClearAll}>
              Clear All History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatSeconds(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0) return '0:00';
  const secs = Math.floor(totalSeconds);
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDate(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}


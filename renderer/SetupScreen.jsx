import React, { useState } from 'react';

export default function SetupScreen({
  binaryStatus,
  downloadProgress,
  downloadError,
  onDownload,
  isDownloading,
}) {
  const { 
    platform, 
    supported, 
    installed, 
    installedBackend,
    note, 
    version,
    gpu,
    recommendedBackend,
    availableBackends,
    downloadSize,
  } = binaryStatus || {};

  const [selectedBackend, setSelectedBackend] = useState(recommendedBackend || 'cpu');

  const formatProgress = () => {
    if (!downloadProgress) return '';
    const { stage, percent, received, total, backend } = downloadProgress;
    
    if (stage === 'extracting') {
      return 'Extracting files...';
    }
    
    if (percent != null) {
      const receivedMB = (received / 1024 / 1024).toFixed(1);
      const totalMB = (total / 1024 / 1024).toFixed(1);
      return `${percent}% (${receivedMB} / ${totalMB} MB)`;
    }
    
    if (received) {
      const receivedMB = (received / 1024 / 1024).toFixed(1);
      return `Downloaded ${receivedMB} MB`;
    }
    
    return 'Starting download...';
  };

  const isIndeterminate = downloadProgress?.stage === 'extracting' || 
    (isDownloading && downloadProgress?.percent == null);

  const getBackendLabel = (backend) => {
    switch (backend) {
      case 'cuda': return '🎮 NVIDIA GPU (CUDA)';
      case 'metal': return '🍎 Apple Metal';
      case 'cpu': return '💻 CPU (OpenBLAS)';
      default: return backend;
    }
  };

  const getSelectedSize = () => {
    const backend = availableBackends?.find(b => b.backend === selectedBackend);
    return backend?.size || downloadSize || 'Unknown';
  };

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-icon">⚙️</div>
        <h1>Setup Required</h1>
        <p className="setup-description">
          Whisper binaries need to be downloaded before you can transcribe audio.
        </p>

        <div className="setup-info">
          <div className="info-row">
            <span className="info-label">Platform:</span>
            <span className="info-value">{platform || 'Unknown'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">GPU Detected:</span>
            <span className="info-value">
              {gpu?.backend === 'cuda' ? `🎮 ${gpu.name}` : 
               gpu?.backend === 'metal' ? `🍎 ${gpu.name}` : 
               '💻 CPU only'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Version:</span>
            <span className="info-value">{version || 'Unknown'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className={`info-value ${installed ? 'success' : 'pending'}`}>
              {installed ? `Installed ✓ (${installedBackend})` : 'Not installed'}
            </span>
          </div>
        </div>

        {!supported && note ? (
          <div className="setup-warning">
            <strong>Note:</strong> {note}
          </div>
        ) : null}

        {supported && !installed ? (
          <div className="setup-actions">
            {availableBackends?.length > 1 && (
              <div className="backend-selector">
                <div className="label">Select acceleration:</div>
                <div className="backend-options">
                  {availableBackends.map((b) => (
                    <label key={b.backend} className={`backend-option ${selectedBackend === b.backend ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="backend"
                        value={b.backend}
                        checked={selectedBackend === b.backend}
                        onChange={(e) => setSelectedBackend(e.target.value)}
                        disabled={isDownloading}
                      />
                      <span className="backend-label">
                        {getBackendLabel(b.backend)}
                        <span className="backend-size">{b.size}</span>
                      </span>
                      {b.backend === recommendedBackend && <span className="recommended-badge">Recommended</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              className="setup-button"
              onClick={() => onDownload(selectedBackend)}
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading...' : `Download ${getBackendLabel(selectedBackend)} (${getSelectedSize()})`}
            </button>

            {isDownloading && (
              <div className="setup-progress">
                <div className={`progress ${isIndeterminate ? 'indeterminate' : ''}`}>
                  <div
                    className="progress-bar"
                    style={isIndeterminate ? {} : { width: `${downloadProgress?.percent || 0}%` }}
                  />
                </div>
                <div className="progress-text">{formatProgress()}</div>
              </div>
            )}

            {downloadError && (
              <div className="setup-error">
                Download failed: {downloadError}
              </div>
            )}
          </div>
        ) : null}

        {installed && (
          <div className="setup-success">
            <p>✓ Setup complete! Using {getBackendLabel(installedBackend)}.</p>
            <button 
              className="ghost small" 
              onClick={() => onDownload(null)}
              style={{ marginTop: '12px' }}
            >
              Re-download / Change backend
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


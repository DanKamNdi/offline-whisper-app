import React from 'react';

export default function ModelPickerModal({
  isOpen,
  onClose,
  supportTable = {},
  installed = {},
  selectedModel,
  recommendedModel,
  onSelect,
  onDownload,
  onDelete,
  downloadProgress = {},
  modelsPath,
  onChoosePath,
  downloadError,
}) {
  if (!isOpen) return null;

  const models = ['tiny', 'base', 'small', 'medium', 'large-v3'].filter((name) => supportTable[name]);

  const formatPercent = (value) => {
    if (value == null) return '(starting...)';
    return `${value}%`;
  };

  const { model: downloadingModel, percent: downloadPercent, received, total } = downloadProgress;

  const isIndeterminate = downloadPercent == null || Number.isNaN(downloadPercent);

  const formatProgressDetail = () => {
    if (!downloadingModel) return '';
    if (isIndeterminate) {
      if (!received) return 'Starting download...';
      return `Received ${formatBytes(received)}`;
    }
    if (received && total) {
      return `${downloadPercent}% (${formatBytes(received)} / ${formatBytes(total)})`;
    }
    return `${downloadPercent}%`;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <h3>Choose a Whisper model</h3>
            <p className="sub">Pick the best supported option. Install happens on demand.</p>
          </div>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="model-grid">
          {models.map((name) => {
            const info = supportTable[name];
            const disabled = !info?.supported;
            const installedStatus = installed[name]?.installed;
            const isSelected = selectedModel === name;
            const recommended = recommendedModel === name;
            return (
              <button
                key={name}
                className={`model-card ${disabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                disabled={disabled}
                onClick={() => onSelect(name)}
              >
                <div className="model-card-head">
                  <div className="model-name">{name}</div>
                  <div className="chip-row">
                    {recommended ? <span className="chip">Recommended</span> : null}
                    {installedStatus ? <span className="chip success">Installed</span> : null}
                  </div>
                </div>
                <div className="model-meta">
                  <div>Size: {info?.downloadSizeMB || '?'} MB</div>
                  <div>Speed: {info?.estimatedSpeedClass}</div>
                  <div>Memory: ~{info?.estimatedRuntimeMemoryGB} GB</div>
                </div>
                {!info?.supported ? <div className="reason">{info?.reason}</div> : null}
              </button>
            );
          })}
        </div>

        <div className="modal-actions">
          <div className="path-row">
            <div className="label">Models folder</div>
            <div className="path-display">{modelsPath || 'Default (app data)'}</div>
            <button className="ghost" onClick={onChoosePath}>
              Change folder
            </button>
          </div>

          {selectedModel && !installed[selectedModel]?.installed ? (
            <div className="download-row">
              <button
                onClick={() => onDownload(selectedModel)}
                disabled={!!downloadingModel && downloadingModel !== selectedModel}
              >
                {downloadingModel === selectedModel
                  ? `Downloading ${selectedModel} ${formatPercent(downloadPercent)}`
                  : `Download ${selectedModel}`}
              </button>
              {downloadingModel === selectedModel ? (
                <div className={`progress ${isIndeterminate ? 'indeterminate' : ''}`}>
                  <div className="progress-bar" style={isIndeterminate ? {} : { width: `${downloadPercent}%` }} />
                </div>
              ) : null}
              {downloadingModel === selectedModel ? (
                <div className="progress-detail">{formatProgressDetail()}</div>
              ) : null}
            </div>
          ) : null}

          {downloadError ? <div className="download-error">Download failed: {downloadError}</div> : null}

          {selectedModel && installed[selectedModel]?.installed ? (
            <div className="download-row">
              <button className="ghost" onClick={() => onDelete(selectedModel)}>
                Delete {selectedModel}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

import React, { useEffect, useRef, useState } from 'react';
import ModelPickerModal from './ModelPickerModal.jsx';
import SetupScreen from './SetupScreen.jsx';
import HistoryModal from './HistoryModal.jsx';

const STATUS = {
  IDLE: 'Idle',
  LISTENING: 'Listening',
  TRANSCRIBING: 'Transcribing',
  DONE: 'Done',
  ERROR: 'Error',
};

export default function App() {
  const api = window.api;

  // Safety check - prevent blank screen
  if (!api) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>⚠️ Initialization Error</h1>
        <p>The Electron API bridge (window.api) is not available.</p>
        <p>This usually means the preload script failed to load.</p>
        <details>
          <summary>Technical Details</summary>
          <pre>window.api: {String(window.api)}</pre>
          <pre>Location: {window.location.href}</pre>
        </details>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}>
          Reload
        </button>
      </div>
    );
  }
  
  // Binary status
  const [binaryStatus, setBinaryStatus] = useState(null);
  const [binaryDownloading, setBinaryDownloading] = useState(false);
  const [binaryProgress, setBinaryProgress] = useState(null);
  const [binaryError, setBinaryError] = useState('');
  
  // App state
  const [capabilities, setCapabilities] = useState(null);
  const [supportTable, setSupportTable] = useState({});
  const [installed, setInstalled] = useState({});
  const [selectedModel, setSelectedModel] = useState('');
  const [recommendedModel, setRecommendedModel] = useState('');
  const [modelsPath, setModelsPath] = useState('');
  const [status, setStatus] = useState(STATUS.IDLE);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [downloadState, setDownloadState] = useState({
    model: null,
    percent: null,
    received: 0,
    total: 0,
  });
  const [downloadError, setDownloadError] = useState('');
  
  // Timer state
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcriptionTime, setTranscriptionTime] = useState(null);
  
  // Typewriter effect state
  const [fullTranscript, setFullTranscript] = useState('');
  const [displayedWordCount, setDisplayedWordCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const workletNodeRef = useRef(null);
  const silentGainNodeRef = useRef(null);
  const pcmDataRef = useRef([]);
  const recordingSampleRateRef = useRef(48000);
  const isProcessingRef = useRef(false);
  const timerRef = useRef(null);
  const typewriterRef = useRef(null);

  useEffect(() => {
    if (!api) {
      setError('Preload bridge is unavailable.');
      setStatus(STATUS.ERROR);
      return;
    }
    
    const checkBinaries = async () => {
      try {
        const binStatus = await api.getBinaryStatus();
        setBinaryStatus(binStatus);
        return binStatus.installed;
      } catch (err) {
        setBinaryError(err.message);
        return false;
      }
    };
    
    const loadApp = async () => {
      try {
        const data = await api.getCapabilities();
        setCapabilities(data.capabilities);
        setSupportTable(data.supportTable || {});
        setInstalled(data.installed || {});
        setSelectedModel(data.selectedModel || data.recommendedModel);
        setRecommendedModel(data.recommendedModel);
        setModelsPath(data.modelsPath || '');
        if (!data.installed?.[data.selectedModel || data.recommendedModel]?.installed) {
          setShowModal(true);
        }
      } catch (err) {
        setError(err.message);
        setStatus(STATUS.ERROR);
      }
    };
    
    const init = async () => {
      const binariesInstalled = await checkBinaries();
      if (binariesInstalled) {
        await loadApp();
      }
    };
    
    init();

    // Subscribe to model download progress
    const unsubModelProgress = api.onModelDownloadProgress?.((progress) => {
      setDownloadError('');
      setDownloadState({
        model: progress.model,
        percent: progress.percent,
        received: progress.received || 0,
        total: progress.total || 0,
      });
    });
    
    // Subscribe to binary download progress
    const unsubBinaryProgress = api.onBinaryDownloadProgress?.((progress) => {
      setBinaryProgress(progress);
    });
    
    // Subscribe to transcription progress (streaming output)
    const unsubTranscribeProgress = api.onTranscribeProgress?.((progress) => {
      if (progress.text) {
        setTranscript(progress.text);
      }
    });
    
    return () => {
      if (typeof unsubModelProgress === 'function') unsubModelProgress();
      if (typeof unsubBinaryProgress === 'function') unsubBinaryProgress();
      if (typeof unsubTranscribeProgress === 'function') unsubTranscribeProgress();
      if (timerRef.current) clearInterval(timerRef.current);
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      stopStream();
    };
  }, []);

  // Typewriter effect - animate words appearing one by one
  useEffect(() => {
    if (!fullTranscript) {
      setDisplayedWordCount(0);
      setIsTyping(false);
      return;
    }

    const words = fullTranscript.split(/\s+/).filter(Boolean);
    
    if (displayedWordCount >= words.length) {
      setIsTyping(false);
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
      return;
    }

    setIsTyping(true);
    
    // Clear any existing interval
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
    }

    // Animate words appearing
    typewriterRef.current = setInterval(() => {
      setDisplayedWordCount((prev) => {
        const next = prev + 1;
        if (next >= words.length) {
          clearInterval(typewriterRef.current);
          typewriterRef.current = null;
          setIsTyping(false);
        }
        return next;
      });
    }, 80); // 80ms per word

    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, [fullTranscript]);

  // Compute displayed transcript from word count
  const displayedTranscript = React.useMemo(() => {
    if (!fullTranscript) return '';
    const words = fullTranscript.split(/\s+/).filter(Boolean);
    return words.slice(0, displayedWordCount).join(' ');
  }, [fullTranscript, displayedWordCount]);

  const refreshModels = async () => {
    if (!api) return;
    const data = await api.listModels();
    setSupportTable(data.supportTable || {});
    setInstalled(data.installed || {});
    if (data.selectedModel) setSelectedModel(data.selectedModel);
    if (data.recommendedModel) setRecommendedModel(data.recommendedModel);
    if (data.modelsPath) setModelsPath(data.modelsPath);
  };

  const handleModelSelect = async (modelName) => {
    setSelectedModel(modelName);
    if (api) await api.selectModel(modelName);
    setShowModal(true);
  };

  const handleDownload = async (modelName) => {
    if (!api) return;
    setDownloadState({ model: modelName, percent: null, received: 0, total: 0 });
    setDownloadError('');
    try {
      await api.downloadModel(modelName);
      await refreshModels();
    } catch (err) {
      setError(err.message);
      setStatus(STATUS.ERROR);
      setDownloadError(err.message);
    } finally {
      setDownloadState({ model: null, percent: null, received: 0, total: 0 });
    }
  };

  const handleDeleteModel = async (modelName) => {
    if (!api) return;
    await api.deleteModel(modelName);
    await refreshModels();
  };

  const handleChoosePath = async () => {
    if (!api?.chooseModelsPath) return;
    const result = await api.chooseModelsPath();
    if (result?.modelsPath) {
      setModelsPath(result.modelsPath);
      await refreshModels();
    }
  };

  const handleBinaryDownload = async (backend = null) => {
    if (!api) return;
    setBinaryDownloading(true);
    setBinaryError('');
    setBinaryProgress(null);
    try {
      const newStatus = await api.downloadBinaries(backend);
      setBinaryStatus(newStatus);
      // If download succeeded, load the rest of the app
      if (newStatus.installed) {
        const data = await api.getCapabilities();
        setCapabilities(data.capabilities);
        setSupportTable(data.supportTable || {});
        setInstalled(data.installed || {});
        setSelectedModel(data.selectedModel || data.recommendedModel);
        setRecommendedModel(data.recommendedModel);
        setModelsPath(data.modelsPath || '');
        if (!data.installed?.[data.selectedModel || data.recommendedModel]?.installed) {
          setShowModal(true);
        }
      }
    } catch (err) {
      setBinaryError(err.message);
    } finally {
      setBinaryDownloading(false);
      setBinaryProgress(null);
    }
  };

  const startRecording = async () => {
    if (!selectedModel || !installed[selectedModel]?.installed) {
      setShowModal(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;
      pcmDataRef.current = [];
      isProcessingRef.current = false;

      const audioContext = new AudioContext();
      recordingSampleRateRef.current = audioContext.sampleRate;
      audioContextRef.current = audioContext;
      console.log('[startRecording] AudioContext sample rate:', audioContext.sampleRate);

      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      console.log('[startRecording] Loading recorder worklet...');
      const workletUrl = new URL('./recorderWorklet.js', import.meta.url);
      await audioContext.audioWorklet.addModule(workletUrl);
      console.log('[startRecording] Recorder worklet loaded');

      const workletNode = new AudioWorkletNode(audioContext, 'recorder-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      });
      workletNodeRef.current = workletNode;
      workletNode.port.onmessage = (event) => {
        if (event.data?.length) {
          pcmDataRef.current.push(event.data);
        }
      };

      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      silentGainNodeRef.current = silentGain;

      sourceNode.connect(workletNode);
      workletNode.connect(silentGain);
      silentGain.connect(audioContext.destination);

      setError('');
      setTranscript('');
      setFullTranscript('');
      setDisplayedWordCount(0);
      setTranscriptionTime(null);
      
      // Start recording timer
      const startTime = Date.now();
      setRecordingStartTime(startTime);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - startTime);
      }, 100);
      
      setStatus(STATUS.LISTENING);
    } catch (err) {
      setError(err.message);
      setStatus(STATUS.ERROR);
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const stopRecording = async () => {
    if (status !== STATUS.LISTENING || isProcessingRef.current) {
      console.warn('[stopRecording] Ignored - not currently recording or already processing');
      return;
    }

    console.log('[stopRecording] Button clicked - finalizing recording');
    isProcessingRef.current = true;

    try {
      await finalizeRecording();
    } catch (err) {
      console.error('[stopRecording] Error finalizing recording:', err);
      setError(err.message || 'Failed to process recording');
      setStatus(STATUS.ERROR);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const finalizeRecording = async () => {
    if (!audioContextRef.current) {
      throw new Error('Audio context not initialized');
    }

    console.log('[finalizeRecording] Stopping audio graph');

    try {
      workletNodeRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();
      silentGainNodeRef.current?.disconnect();
    } catch (err) {
      console.warn('[finalizeRecording] Error while disconnecting nodes:', err);
    }

    await audioContextRef.current.close().catch((err) => {
      console.warn('[finalizeRecording] Failed to close audio context:', err);
    });

    workletNodeRef.current = null;
    sourceNodeRef.current = null;
    silentGainNodeRef.current = null;
    audioContextRef.current = null;

    // Stop recording timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const finalRecordingDuration = Date.now() - recordingStartTime;
    setRecordingDuration(finalRecordingDuration);

    setStatus(STATUS.TRANSCRIBING);
    const transcribeStart = Date.now();

    try {
      const merged = mergeFloat32Arrays(pcmDataRef.current);
      console.log('[finalizeRecording] Captured samples:', merged.length, 'at', recordingSampleRateRef.current, 'Hz');

      if (!merged.length) {
        throw new Error('No audio data was captured. Please try again.');
      }

      const resampled = downsampleBuffer(merged, recordingSampleRateRef.current, 16000);
      console.log('[finalizeRecording] Resampled samples:', resampled.length);

      const wavBuffer = encodeWav(resampled, 16000);
      console.log('[finalizeRecording] WAV buffer length:', wavBuffer.byteLength);

      if (!api) throw new Error('Bridge unavailable');

      const result = await api.startTranscription(new Uint8Array(wavBuffer), finalRecordingDuration);
      console.log('[finalizeRecording] Transcription complete:', result);

      const finalText = result.transcript || '';
      setFullTranscript(finalText);
      setTranscript(finalText);
      setTranscriptionTime(result.elapsedMs || (Date.now() - transcribeStart));
      setStatus(STATUS.DONE);
    } catch (err) {
      console.error('[finalizeRecording] Error during transcription pipeline:', err);
      setError(err.message || 'Failed to transcribe recording');
      setStatus(STATUS.ERROR);
    } finally {
      stopStream();
      console.log('[finalizeRecording] Stream stopped');
    }
  };

  const copyTranscript = () => {
    if (!transcript) return;
    api?.writeClipboard(transcript);
  };

  const readyToRecord =
    selectedModel && installed[selectedModel]?.installed && status !== STATUS.LISTENING && status !== STATUS.TRANSCRIBING;

  // Show setup screen if binaries not installed
  if (binaryStatus && !binaryStatus.installed) {
    return (
      <SetupScreen
        binaryStatus={binaryStatus}
        downloadProgress={binaryProgress}
        downloadError={binaryError}
        onDownload={handleBinaryDownload}
        isDownloading={binaryDownloading}
      />
    );
  }

  // Show loading state while checking binary status
  if (!binaryStatus) {
    return (
      <div className="app loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Offline Whisper</h1>
          <p className="sub">Local speech-to-text using whisper.cpp</p>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={() => setShowHistory(true)}>
            History
          </button>
          <button className="ghost" onClick={() => setShowModal(true)}>
            Models
          </button>
        </div>
      </header>

      <div className="status-row">
        <div>
          <div className="label">Status</div>
          <div className={`status ${status.toLowerCase()}`}>{status}</div>
        </div>
        <div>
          <div className="label">Model</div>
          <div className="pill">
            {selectedModel || 'None'} {installed[selectedModel]?.installed ? '• Installed' : ''}
          </div>
        </div>
        <div>
          <div className="label">
            {status === STATUS.LISTENING ? 'Recording' : status === STATUS.TRANSCRIBING ? 'Processing' : 'Time'}
          </div>
          <div className="timer">
            {status === STATUS.LISTENING && (
              <span className="recording-time">{formatDuration(recordingDuration)}</span>
            )}
            {status === STATUS.TRANSCRIBING && (
              <span className="processing-indicator">⏳ Processing...</span>
            )}
            {status === STATUS.DONE && transcriptionTime != null && (
              <span className="done-time">
                {formatDuration(recordingDuration)} rec → {(transcriptionTime / 1000).toFixed(1)}s
              </span>
            )}
            {status === STATUS.IDLE && '—'}
          </div>
        </div>
      </div>

      <div className="controls">
        <button onClick={startRecording} disabled={!readyToRecord || status === STATUS.LISTENING}>
          Start Recording
        </button>
        <button onClick={stopRecording} disabled={status !== STATUS.LISTENING}>
          Stop
        </button>
        <button onClick={copyTranscript} disabled={!transcript}>
          Copy
        </button>
      </div>

      <div className="panel">
        <div className="label">
          Transcript
          {isTyping && <span className="typing-indicator"> ✍️ typing...</span>}
        </div>
        <div className="transcript-container">
          <textarea 
            value={isTyping ? displayedTranscript : transcript} 
            onChange={(e) => {
              setTranscript(e.target.value);
              setFullTranscript(e.target.value);
              setDisplayedWordCount(e.target.value.split(/\s+/).filter(Boolean).length);
            }} 
            placeholder="Transcript will appear here..." 
            className={isTyping ? 'typing' : ''}
          />
          {isTyping && <span className="cursor">|</span>}
        </div>
      </div>

      {error && (
        <div className="error" style={{ 
          marginTop: '10px', 
          padding: '15px', 
          background: '#fef2f2', 
          border: '2px solid #dc2626',
          borderRadius: '10px',
          fontSize: '14px'
        }}>
          <strong>❌ Error:</strong> {error}
          <br />
          <small style={{ marginTop: '5px', display: 'block', color: '#666' }}>
            Check the console (F12) for more details
          </small>
        </div>
      )}

      <ModelPickerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        supportTable={supportTable}
        installed={installed}
        selectedModel={selectedModel}
        recommendedModel={recommendedModel}
        onSelect={handleModelSelect}
        onDownload={handleDownload}
        onDelete={handleDeleteModel}
        downloadProgress={downloadState}
        modelsPath={modelsPath}
        onChoosePath={handleChoosePath}
        downloadError={downloadError}
      />

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        api={api}
      />
    </div>
  );
}

function mergeFloat32Arrays(chunks) {
  if (!chunks?.length) return new Float32Array(0);
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function downsampleBuffer(buffer, inputSampleRate, targetSampleRate) {
  if (targetSampleRate >= inputSampleRate) {
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = accum / count || 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i += 1) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

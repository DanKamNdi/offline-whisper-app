# Architecture Overview

This document provides a technical overview of the Offline Whisper application architecture.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Binary Management](#binary-management)
- [Model Management](#model-management)
- [IPC Communication](#ipc-communication)
- [Storage](#storage)
- [Security Considerations](#security-considerations)

## High-Level Architecture

Offline Whisper is built on Electron, which provides a Chromium-based renderer process (UI) and a Node.js-based main process (backend). The app is fully offline after initial setup.

```
┌─────────────────────────────────────────────────────────────┐
│                      Renderer Process (UI)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React App (renderer/)                                │  │
│  │  - App.jsx (main UI)                                  │  │
│  │  - ModelPickerModal.jsx (model selection)            │  │
│  │  - HistoryModal.jsx (transcription history)          │  │
│  │  - SetupScreen.jsx (first-run setup)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕ IPC                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Preload Script (main/preload.cjs)                    │  │
│  │  - Safe API bridge to main process                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                       Main Process (Node.js)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Core Modules (main/)                                 │  │
│  │  - index.js (app initialization)                      │  │
│  │  - ipc.js (IPC handlers)                              │  │
│  │  - capabilities.js (hardware detection)               │  │
│  │  - models.js (model metadata & policy)                │  │
│  │  - downloader.js (model download/cache)               │  │
│  │  - whisperRunner.js (spawn whisper.cpp)               │  │
│  │  - binaryDownloader.js (whisper.cpp download)         │  │
│  │  - history.js (transcription history)                 │  │
│  │  - config.js (user preferences)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  whisper.cpp Binary                                   │  │
│  │  - Native speech-to-text engine                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend (Renderer Process)
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **CSS3** - Styling (no frameworks)
- **Web Audio API** - Audio recording and processing

### Backend (Main Process)
- **Electron 28** - Desktop app framework
- **Node.js** - JavaScript runtime
- **systeminformation** - Hardware capability detection
- **whisper.cpp** - Native binary for transcription

### Testing
- **Vitest** - Unit testing framework

## Project Structure

```
offline-whisper/
├── main/                    # Main process (Node.js backend)
│   ├── index.js            # App lifecycle & window management
│   ├── ipc.js              # IPC channel handlers
│   ├── capabilities.js     # Hardware detection (RAM, CPU, GPU)
│   ├── models.js           # Model metadata & support policy
│   ├── downloader.js       # Model download & caching
│   ├── whisperRunner.js    # Spawn whisper.cpp process
│   ├── binaryDownloader.js # Download whisper.cpp binaries
│   ├── history.js          # Transcription history management
│   ├── config.js           # User configuration persistence
│   └── preload.cjs         # Secure renderer bridge
│
├── renderer/                # Renderer process (React UI)
│   ├── App.jsx             # Main application component
│   ├── ModelPickerModal.jsx # Model selection & download UI
│   ├── HistoryModal.jsx    # Transcription history viewer
│   ├── SetupScreen.jsx     # First-run binary setup
│   ├── index.css           # Global styles
│   ├── main.jsx            # React entry point
│   └── test/               # Unit tests
│
├── shared/                  # Shared between main & renderer
│   └── ipcChannels.js      # IPC channel name constants
│
├── resources/               # Static resources
│   ├── bin/                # whisper.cpp binaries (gitignored)
│   └── icon.{ico,png}      # App icons
│
├── dist/                    # Built renderer assets (gitignored)
└── release/                 # Distribution builds (gitignored)
```

## Core Components

### 1. Capabilities Detection (`capabilities.js`)

Detects system hardware to determine which Whisper models are supported:

- **RAM** - Total system memory
- **CPU** - Core count and architecture
- **GPU** - VRAM, vendor, and compute backend (CUDA/Metal/etc.)

Uses Node.js `os` module and `systeminformation` package.

### 2. Model Support Policy (`models.js`)

Implements rules for which models work on given hardware:

**CPU-Only Rules:**
- RAM < 6 GB, cores ≤ 4 → max `base` model
- RAM 6-12 GB, cores ≥ 4 → max `small` model  
- RAM ≥ 12 GB, cores ≥ 6 → max `medium` model
- RAM ≥ 24 GB, cores ≥ 12 → enable `large-v3`

**GPU Rules:**
- VRAM ≥ 8 GB → enable all models (default `large-v3`)
- VRAM 4-8 GB → max `medium` model
- VRAM < 4 GB → fall back to CPU rules

### 3. Model Downloader (`downloader.js`)

Downloads quantized Whisper models from HuggingFace:

```
https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{model}-q5_0.bin
```

Models are cached in:
```
<userData>/models/<modelName>/ggml-{model}-q5_0.bin
```

Supports:
- Progress tracking
- SHA256 verification (future)
- Resumable downloads (future)
- Custom download location

### 4. Binary Downloader (`binaryDownloader.js`)

Downloads platform-specific whisper.cpp binaries from GitHub releases.

Supports multiple backends:
- **CPU** - Pure CPU inference
- **CUDA** - NVIDIA GPU acceleration
- **Metal** - Apple GPU acceleration (macOS)
- **OpenCL** - Cross-platform GPU

Binaries are stored in `resources/bin/`.

### 5. Whisper Runner (`whisperRunner.js`)

Spawns the whisper.cpp binary as a child process:

```bash
whisper.exe -m <model> -f <audio> -l <lang> -t <threads> -bs 1 -pp
```

Key parameters:
- `-m` - Model path
- `-f` - Audio file (16kHz mono WAV)
- `-l` - Language code (default: `en`)
- `-t` - Thread count (uses all CPU cores)
- `-bs` - Beam size (1 = greedy, fastest)
- `-pp` - Print progress

Parses stdout for transcription text.

### 6. History Manager (`history.js`)

Manages transcription history stored in JSON:

```json
{
  "entries": [
    {
      "id": "uuid",
      "timestamp": 1234567890,
      "model": "base",
      "audioDurationMs": 5000,
      "transcriptionTimeMs": 1200,
      "transcript": "Hello world"
    }
  ]
}
```

Stored at: `<userData>/transcription-history.json`

## Data Flow

### Recording & Transcription Flow

```
1. User clicks "Start Recording"
   └─> MediaRecorder API captures audio (opus/webm)

2. User clicks "Stop"
   └─> Renderer: Convert audio to 16kHz mono WAV
       ├─> AudioContext.decodeAudioData()
       ├─> OfflineAudioContext for resampling
       └─> encodeWav() creates WAV buffer

3. Renderer → Main (IPC): Send WAV buffer
   └─> Main: Write to temp file

4. Main: Spawn whisper.cpp process
   └─> stdout: Parse transcription text
   └─> stderr: Error messages

5. Main → Renderer (IPC): Send transcript
   └─> Renderer: Display with typewriter effect

6. Main: Save to history
   └─> history.json updated
```

### Model Download Flow

```
1. User opens Model Picker Modal
   └─> Show installed & available models

2. User clicks "Download"
   └─> Renderer → Main (IPC): Download request

3. Main: HTTP GET from HuggingFace
   ├─> Stream to file
   └─> Send progress via IPC events

4. Main → Renderer (IPC): Progress updates
   └─> Renderer: Show progress bar

5. Download complete
   └─> Verify file exists
   └─> Update installed models list
   └─> Close modal
```

## IPC Communication

All communication between renderer and main uses Electron IPC:

### Channels (`shared/ipcChannels.js`)

```javascript
{
  CAPABILITIES_REQUEST: 'capabilities:request',
  TRANSCRIBE_START: 'transcribe:start',
  TRANSCRIBE_PROGRESS: 'transcribe:progress',
  MODEL_DOWNLOAD: 'model:download',
  MODEL_DOWNLOAD_PROGRESS: 'model:download:progress',
  // ... more channels
}
```

### Security

- Renderer has **no direct Node.js access**
- All Node APIs exposed via **preload script**
- Preload uses `contextBridge.exposeInMainWorld()`
- Only whitelisted APIs are exposed

Example preload exposure:
```javascript
contextBridge.exposeInMainWorld('api', {
  getCapabilities: () => ipcRenderer.invoke('capabilities:request'),
  startTranscription: (data) => ipcRenderer.invoke('transcribe:start', data),
  // Safe, scoped API
});
```

## Storage

### User Data Directory

Electron's `app.getPath('userData')` stores:

```
Windows: C:\Users\<user>\AppData\Roaming\Offline Whisper
macOS:   ~/Library/Application Support/Offline Whisper
Linux:   ~/.config/offline-whisper
```

Contents:
```
userData/
├── config.json                 # User preferences
├── transcription-history.json  # Transcription log
└── models/                     # Downloaded models
    ├── tiny/
    ├── base/
    ├── small/
    ├── medium/
    └── large-v3/
```

### Configuration (`config.json`)

```json
{
  "selectedModel": "base",
  "modelsPath": "C:\\Users\\user\\MyModels",
  "language": "en"
}
```

## Security Considerations

### Context Isolation

- Renderer process runs in **sandboxed** environment
- No direct `require()` or Node.js APIs
- Communication only via IPC

### Preload Script

- Whitelist safe operations
- Validate all inputs
- Never expose raw IPC to renderer

### Binary Execution

- Binaries run as child processes (isolated)
- Validate binary paths before execution
- Limit file system access

### Network Security

- Downloads use HTTPS
- Verify file checksums (planned)
- No telemetry or analytics

## Performance Optimizations

### Audio Processing

- Process audio in renderer (offload from main)
- Use OfflineAudioContext for non-blocking resampling
- Stream data via typed arrays (Uint8Array)

### Transcription

- Use all available CPU threads (`-t` flag)
- Greedy decoding (`-bs 1`) for speed
- Print progress (`-pp`) for UI updates

### Model Loading

- Cache models on disk (no re-download)
- Lazy load models (only when needed)
- Support custom storage paths

### UI Responsiveness

- Typewriter effect for transcript reveal
- Progress bars for downloads
- Non-blocking operations (async/await)

## Future Enhancements

- **GPU Acceleration** - CUDA/Metal support detection
- **Multi-language** - Language detection & selection
- **Live Transcription** - Real-time streaming mode
- **Cloud Sync** - Optional history backup
- **Plugins** - Extensible architecture
- **Themes** - Dark mode and custom themes
- **Hotkeys** - Global shortcuts for recording

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT - See [LICENSE](LICENSE) for details.


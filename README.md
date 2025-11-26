# 🎙️ Offline Whisper

<div align="center">

**Privacy-focused offline speech-to-text desktop app powered by Whisper.cpp**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![GitHub issues](https://img.shields.io/github/issues/DanKamNdi/offline-whisper-app)](https://github.com/DanKamNdi/offline-whisper-app/issues)
[![GitHub stars](https://img.shields.io/github/stars/DanKamNdi/offline-whisper-app?style=social)](https://github.com/DanKamNdi/offline-whisper-app/stargazers)

[Features](#-features) • [Download](#-download) • [Getting Started](#-getting-started) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🌟 Features

- **🔒 100% Offline** - All processing happens locally. Your audio never leaves your device.
- **🚀 Fast & Accurate** - Powered by OpenAI's Whisper via whisper.cpp native binaries
- **🎯 Smart Model Selection** - Automatically recommends the best model for your hardware
- **💾 On-Demand Downloads** - Models downloaded only when needed (no bloated installation)
- **🖥️ Cross-Platform** - Works on Windows, macOS, and Linux
- **⚡ GPU Acceleration** - CUDA, Metal, and OpenCL support for faster transcription
- **📊 History Tracking** - Keep track of all your transcriptions with stats
- **🎨 Modern UI** - Beautiful, intuitive interface with gradient design
- **📝 Easy Export** - Copy transcripts to clipboard with one click
- **🔧 Customizable** - Choose your own model storage location

## 📥 Download

### Latest Release

Download the latest version for your platform:

- **Windows**: [Offline Whisper Setup.exe](https://github.com/DanKamNdi/offline-whisper-app/releases)
- **macOS**: [Offline Whisper.dmg](https://github.com/DanKamNdi/offline-whisper-app/releases)
- **Linux**: [Offline Whisper.AppImage](https://github.com/DanKamNdi/offline-whisper-app/releases)

### Current Releases

| Version | Date       | Platforms               | Notes                                                                                           |
| ------- | ---------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| v0.1.0  | 2025-01-XX | Windows / macOS / Linux | Initial public release with local recording, offline transcription, model manager, and history. |

Grab installers from the [Releases page](https://github.com/DanKamNdi/offline-whisper-app/releases). New builds will be added to this table as they ship.

### System Requirements

**Minimum:**

- RAM: 4 GB
- CPU: Dual-core processor
- Disk: 500 MB (app) + 75 MB - 3 GB (models)
- OS: Windows 10+, macOS 10.13+, or modern Linux

**Recommended for Best Experience:**

- RAM: 8 GB+
- CPU: Quad-core processor or better
- GPU: 4 GB+ VRAM (NVIDIA, AMD, or Apple Silicon)
- Disk: 5 GB free space

## 🚀 Getting Started

### First Run

1. **Launch the app** - Double-click the executable
2. **Download binaries** - The app will automatically download whisper.cpp binaries (~100 MB)
3. **Select a model** - Choose from tiny, base, small, medium, or large-v3
4. **Download model** - Click "Download" to fetch the selected model
5. **Start recording** - Click "Start Recording" and speak into your microphone
6. **Get transcript** - Click "Stop" when done and watch your transcript appear!

### Supported Models

| Model    | Size    | RAM Required | Transcription Speed | Accuracy  |
| -------- | ------- | ------------ | ------------------- | --------- |
| tiny     | ~75 MB  | 4 GB         | Fastest             | Good      |
| base     | ~142 MB | 4 GB         | Very Fast           | Better    |
| small    | ~466 MB | 6 GB         | Fast                | Great     |
| medium   | ~1.5 GB | 8 GB         | Moderate            | Excellent |
| large-v3 | ~3 GB   | 12 GB+       | Slower              | Best      |

> Models are quantized (Q5) for optimal size/quality balance

### Model Selection Logic

The app automatically recommends models based on your hardware:

- **CPU-only systems**: Recommends based on RAM and core count
- **Systems with GPU**: Takes advantage of VRAM for faster transcription
- **Low-end devices**: Safely limits to smaller models to prevent slowdowns

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- Git
- Windows: Visual Studio Build Tools (for native modules)
- macOS: Xcode Command Line Tools
- Linux: Build essentials (`build-essential` on Debian/Ubuntu)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/DanKamNdi/offline-whisper-app.git
cd offline-whisper-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will launch with hot-reload enabled. Changes to renderer code will automatically refresh.

### Build for Production

```bash
# Build renderer assets
npm run build

# Build installer for current platform
npm run build:electron

# Platform-specific builds
npm run build:win      # Windows installer
npm run build:mac      # macOS DMG
npm run build:linux    # Linux AppImage
```

Built installers will be in the `release/` directory.

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## 📂 Project Structure

```
offline-whisper/
├── main/                    # Electron main process (Node.js)
│   ├── capabilities.js     # Hardware detection
│   ├── models.js           # Model support policy
│   ├── downloader.js       # Model downloads
│   ├── whisperRunner.js    # Whisper.cpp execution
│   └── ipc.js              # IPC handlers
│
├── renderer/                # React UI
│   ├── App.jsx             # Main app component
│   ├── ModelPickerModal.jsx
│   ├── HistoryModal.jsx
│   └── SetupScreen.jsx
│
├── shared/                  # Shared constants
├── resources/               # Icons and binaries
└── dist/                    # Built assets
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation.

## 📖 Documentation

- [Architecture Overview](ARCHITECTURE.md) - Technical deep dive
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community guidelines
- [Changelog](CHANGELOG.md) - Version history

## 🤝 Contributing

We welcome contributions! Here's how you can help:

- 🐛 **Report bugs** - [Open an issue](https://github.com/DanKamNdi/offline-whisper-app/issues/new?template=bug_report.yml)
- 💡 **Suggest features** - [Request a feature](https://github.com/DanKamNdi/offline-whisper-app/issues/new?template=feature_request.yml)
- 📝 **Improve docs** - Submit PRs for documentation
- 💻 **Write code** - Check [good first issues](https://github.com/DanKamNdi/offline-whisper-app/labels/good%20first%20issue)
- 🌍 **Translate** - Help localize the app (coming soon)

Read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 🏗️ Built With

- [Electron](https://www.electronjs.org/) - Desktop app framework
- [React](https://reactjs.org/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - Whisper inference engine
- [Whisper](https://github.com/openai/whisper) - OpenAI's speech recognition model

## 🙏 Acknowledgments

- OpenAI for the [Whisper](https://github.com/openai/whisper) model
- [ggerganov](https://github.com/ggerganov) for [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- All our [contributors](https://github.com/OWNER/offline-whisper/graphs/contributors)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔐 Privacy

**Your privacy is our priority.**

- ✅ All transcription happens locally on your device
- ✅ No cloud API calls
- ✅ No telemetry or analytics
- ✅ No user tracking
- ✅ Your audio and transcripts never leave your computer

The only network requests are:

- Initial download of whisper.cpp binaries (one-time)
- Model downloads from HuggingFace (optional, on-demand)

## ⭐ Star History

If you find this project useful, please consider giving it a star!

[![Star History Chart](https://api.star-history.com/svg?repos=DanKamNdi/offline-whisper-app&type=Date)](https://star-history.com/#DanKamNdi/offline-whisper-app&Date)

## 📬 Contact

- **Issues**: [GitHub Issues](https://github.com/DanKamNdi/offline-whisper-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DanKamNdi/offline-whisper-app/discussions)
- **Email**: [your-email@example.com]

---

<div align="center">

**Made with ❤️ by the Offline Whisper community**

[⬆ back to top](#-offline-whisper)

</div>

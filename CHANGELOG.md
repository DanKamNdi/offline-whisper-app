# Changelog

All notable changes to Offline Whisper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Open source preparation with comprehensive documentation
- Issue and PR templates for GitHub
- GitHub Actions CI/CD workflows
- Architecture documentation
- Contributing guidelines
- Code of Conduct
- Automatic installation of the Microsoft Visual C++ runtime on Windows when it's missing

### Fixed
- Audio decoding issue causing blank screen after recording stops
- Changed audio codec priority to prefer Opus over PCM for better browser compatibility
- Added 30-second timeout for audio decoding to prevent infinite hangs
- Resolved whisper.cpp exit code `0xC0000135` by installing missing DLL dependencies automatically

## [0.1.0] - 2025-01-XX

### Added
- Initial release of Offline Whisper
- Local speech-to-text using whisper.cpp
- Support for multiple Whisper models (tiny, base, small, medium, large-v3)
- Intelligent model recommendations based on hardware capabilities
- On-demand model downloading from HuggingFace
- Hardware capability detection (CPU, RAM, GPU)
- Audio recording with microphone input
- Real-time transcription progress
- Transcription history with stats
- Copy-to-clipboard functionality
- Custom model storage location
- Binary auto-download for whisper.cpp
- Multiple backend support (CPU, CUDA, Metal, OpenCL)
- Typewriter effect for transcript display
- Modern, gradient-based UI design
- Complete offline operation after initial setup

### Technical Features
- Electron 28 + React 18
- JavaScript-only codebase (no TypeScript)
- Vite for fast development and building
- IPC-based secure renderer-main communication
- 16kHz mono WAV audio processing
- Multi-threaded transcription for performance
- Quantized models (Q5) for efficiency

### Supported Platforms
- Windows 10/11 (x64)
- macOS (Intel & Apple Silicon)
- Linux (Ubuntu, other distros)

---

## Release Notes Format

### Types of Changes
- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security fixes

### Version Numbers
- **Major** (1.x.x) - Breaking changes
- **Minor** (x.1.x) - New features, backwards compatible
- **Patch** (x.x.1) - Bug fixes, backwards compatible

---

## Future Roadmap

### Planned Features
- [ ] Dark mode and theme customization
- [ ] Multiple language support beyond English
- [ ] Live/streaming transcription mode
- [ ] Keyboard shortcuts and hotkeys
- [ ] Export transcripts (txt, srt, vtt)
- [ ] Timestamp display with seekable audio
- [ ] Speaker diarization
- [ ] Custom model import
- [ ] Plugins/extensions system
- [ ] Cloud backup for history (optional)
- [ ] Auto-update mechanism
- [ ] Accessibility improvements (screen reader support)
- [ ] Performance profiling tools
- [ ] Batch file transcription
- [ ] Audio file import (drag & drop)

### Under Consideration
- [ ] Mobile companion app
- [ ] Web version (WebAssembly)
- [ ] Integration with note-taking apps
- [ ] API for third-party apps
- [ ] Multi-model ensemble transcription
- [ ] Fine-tuning support for custom models

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute to this changelog.

When adding entries:
1. Add unreleased changes under `[Unreleased]`
2. Keep descriptions clear and user-focused
3. Link to relevant PRs and issues
4. Group changes by type (Added, Fixed, etc.)

[Unreleased]: https://github.com/OWNER/offline-whisper/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/OWNER/offline-whisper/releases/tag/v0.1.0


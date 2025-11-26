# Contributing to Offline Whisper

Thank you for your interest in contributing to Offline Whisper! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/offline-whisper.git
   cd offline-whisper
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/offline-whisper.git
   ```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Windows/macOS/Linux development environment
- Git

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will launch with hot-reload enabled. Changes to renderer code will auto-refresh.

### Project Structure

```
.
├── main/           # Electron main process (Node.js)
├── renderer/       # React UI components
├── shared/         # Shared constants (IPC channels)
├── resources/      # App icons and binaries
└── dist/           # Built assets (gitignored)
```

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- 🐛 **Bug fixes**
- ✨ **New features**
- 📝 **Documentation improvements**
- 🎨 **UI/UX enhancements**
- 🧪 **Tests**
- 🌐 **Translations** (future)
- ♿ **Accessibility improvements**

### Before You Start

1. **Check existing issues** to avoid duplicate work
2. **Create or comment on an issue** to discuss your planned changes
3. **Wait for feedback** from maintainers on significant changes

## Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clear, concise commit messages
   - Follow the coding standards
   - Add tests if applicable
   - Update documentation

3. **Test your changes**:
   ```bash
   npm test                 # Run unit tests
   npm run build           # Ensure build succeeds
   npm run dev             # Test in development
   ```

4. **Commit with descriptive messages**:
   ```bash
   git commit -m "feat: add dark mode support"
   git commit -m "fix: resolve audio decoding issue"
   git commit -m "docs: update installation instructions"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**:
   - Use a clear, descriptive title
   - Reference related issues (e.g., "Fixes #123")
   - Describe what changes you made and why
   - Add screenshots for UI changes

7. **Respond to feedback**:
   - Be open to suggestions
   - Make requested changes promptly
   - Keep discussions professional and respectful

### Commit Message Convention

We follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Coding Standards

### JavaScript Style

- Use **ES6+ modern JavaScript**
- No TypeScript (project policy)
- Use **functional components** in React
- Prefer **const/let** over var
- Use **async/await** over raw promises
- Use **meaningful variable names**

### Code Quality

- Keep functions small and focused
- Avoid deep nesting (max 3 levels)
- Add comments for complex logic
- Handle errors gracefully
- No console.log in production (use proper logging)

### React Guidelines

- Use hooks (useState, useEffect, useRef, etc.)
- Keep components focused and reusable
- Props should have clear, descriptive names
- Avoid inline styles (use CSS classes)

### Electron Best Practices

- Keep main process logic separate from renderer
- Use IPC for renderer-main communication
- Never expose Node.js APIs directly to renderer
- Use preload scripts for security

## Testing

### Running Tests

```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode for development
```

### Writing Tests

- Add tests for new features
- Use meaningful test descriptions
- Test edge cases and error conditions
- Keep tests focused and independent

Example:
```javascript
import { describe, it, expect } from 'vitest';

describe('Model Support Policy', () => {
  it('should recommend base model for low-end CPU', () => {
    const capabilities = { ram: 4, cores: 2, gpu: null };
    const result = pickBestModel(getModelSupport(capabilities));
    expect(result).toBe('base');
  });
});
```

## Reporting Bugs

When reporting bugs, please include:

1. **Clear title** describing the issue
2. **Steps to reproduce**:
   - What did you do?
   - What did you expect?
   - What actually happened?
3. **Environment information**:
   - OS and version
   - App version
   - Hardware specs (RAM, CPU)
4. **Screenshots or logs** if applicable
5. **Console errors** (from DevTools)

Use the bug report template when creating issues.

## Feature Requests

We love feature ideas! When requesting features:

1. **Check existing issues** to avoid duplicates
2. **Describe the problem** you're trying to solve
3. **Explain your proposed solution**
4. **Consider alternatives** you've thought about
5. **Add mockups/examples** if helpful

Use the feature request template when creating issues.

## Questions?

- Check existing [documentation](README.md)
- Search [closed issues](https://github.com/OWNER/offline-whisper/issues?q=is%3Aissue+is%3Aclosed)
- Ask in [discussions](https://github.com/OWNER/offline-whisper/discussions)
- Tag maintainers in issues for urgent matters

## Recognition

Contributors will be:
- Listed in our [CHANGELOG](CHANGELOG.md)
- Credited in release notes
- Added to GitHub's contributors page

Thank you for making Offline Whisper better! 🎉


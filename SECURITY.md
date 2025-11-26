# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

The Offline Whisper team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **[ndirangualvinkamau@gmail.com]**

Include the following information:

1. **Type of issue** (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
2. **Full paths** of source file(s) related to the manifestation of the issue
3. **Location** of the affected source code (tag/branch/commit or direct URL)
4. **Step-by-step instructions** to reproduce the issue
5. **Proof-of-concept or exploit code** (if possible)
6. **Impact** of the issue, including how an attacker might exploit it

### What to Expect

- **Acknowledgment**: You should receive a response within 48 hours acknowledging your report.
- **Updates**: We'll keep you informed about the progress toward fixing the vulnerability.
- **Disclosure**: Once the issue is resolved, we'll work with you on the disclosure timeline.
- **Credit**: We'll credit you in the release notes (unless you prefer to remain anonymous).

### Responsible Disclosure

We follow a responsible disclosure model:

1. **Report** is received and acknowledged
2. **Validation** - We confirm and reproduce the issue
3. **Fix** is developed and tested
4. **Release** - Security patch is released
5. **Public disclosure** - After users have had time to update (typically 7-14 days)

## Security Best Practices for Users

### Keep Your App Updated

- Always use the latest version of Offline Whisper
- Enable auto-updates if available (future feature)
- Check for updates regularly

### Download from Official Sources Only

- Download only from [GitHub Releases](https://github.com/OWNER/offline-whisper/releases)
- Verify checksums of downloaded files (coming soon)
- Be wary of third-party download sites

### System Security

- Keep your operating system updated
- Use antivirus/antimalware software
- Don't run the app with administrator privileges unless necessary

### Privacy & Data

- Review the app's [Privacy Policy](README.md#-privacy)
- Understand that transcripts are stored locally
- Delete sensitive transcripts from history when no longer needed

## Known Security Considerations

### Audio Recording Permissions

- The app requires microphone access to function
- Microphone access is only used when you click "Start Recording"
- No recording happens in the background

### Local Data Storage

- Transcripts are stored in plain text locally
- Use disk encryption (BitLocker, FileVault, LUKS) for sensitive data
- History can be cleared from the app settings

### Binary Execution

- The app downloads and executes whisper.cpp binaries
- Binaries are downloaded from official whisper.cpp releases
- Future versions will verify binary signatures

### Network Requests

The app makes network requests only for:

1. Downloading whisper.cpp binaries (one-time, on first run)
2. Downloading Whisper models (on-demand, from HuggingFace)

No analytics, telemetry, or user data is transmitted.

## Security Features

### Current

- ✅ **Context isolation** in Electron (renderer has no Node.js access)
- ✅ **Preload script** for secure IPC communication
- ✅ **No remote code execution**
- ✅ **Sandboxed renderer process**
- ✅ **HTTPS for all downloads**
- ✅ **No eval() or Function() constructor**

### Planned

- [ ] Code signing for installers
- [ ] Checksum verification for downloads
- [ ] Auto-update with signature verification
- [ ] Encrypted storage for sensitive transcripts
- [ ] Permission controls for file system access

## Vulnerability Disclosure

Past security advisories will be published at:
[https://github.com/OWNER/offline-whisper/security/advisories](https://github.com/OWNER/offline-whisper/security/advisories)

## Security Hall of Fame

We thank the following people for responsibly disclosing security issues:

- _[Your name could be here!]_

## Additional Resources

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CVE Database](https://cve.mitre.org/)

## Questions?

If you have questions about this policy, please open a [Discussion](https://github.com/OWNER/offline-whisper/discussions).

---

_This security policy was last updated on January 2025._

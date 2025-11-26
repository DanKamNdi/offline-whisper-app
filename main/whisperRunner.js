import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import { getExecutablePath } from './binaryDownloader.js';

export async function getWhisperBinaryPath() {
  return getExecutablePath();
}

export async function runWhisper({ modelPath, audioPath, language = 'en', onProgress }) {
  const binPath = await getWhisperBinaryPath();
  if (!binPath || !fs.existsSync(binPath)) {
    throw new Error('whisper.cpp binary not found. Please download it first.');
  }

  // Use all available CPU threads for faster processing
  const threadCount = Math.max(1, os.cpus().length);
  
  const args = [
    '-m', modelPath,
    '-f', audioPath,
    '-l', language,
    '-t', String(threadCount),   // Use all CPU threads
    '-bs', '1',                  // Beam size 1 = greedy decoding (faster)
    '-pp',                       // Print progress
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(binPath, args);
    let stdout = '';
    let stderr = '';
    let currentText = '';

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      
      // Parse and send progressive output
      const newText = parseTranscript(stdout);
      if (newText !== currentText) {
        currentText = newText;
        if (onProgress) {
          onProgress({ text: currentText, done: false });
        }
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const combined = [stdout, stderr].filter(Boolean).join('\n');
        reject(new Error(`whisper.cpp exited with code ${code}: ${combined || 'no output'}`));
        return;
      }
      const transcript = parseTranscript(stdout);
      if (onProgress) {
        onProgress({ text: transcript, done: true });
      }
      resolve(transcript);
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

function parseTranscript(stdout) {
  const lines = stdout.split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    // Remove timestamp lines like [00:00:00.000 --> 00:00:08.980]
    .map((line) => line.replace(/^\[[\d:.]+\s*-->\s*[\d:.]+\]\s*/, ''))
    // Filter out progress indicators and empty lines
    .filter((line) => line && !line.startsWith('whisper_') && !line.includes('processing'));
  
  if (!lines.length) return '';
  
  // Join and clean up
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

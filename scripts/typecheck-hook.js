#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook for Write|Edit events.
 * Reads JSON from stdin, and when the edited file is TypeScript, runs the
 * project's own `tsc --noEmit` so type errors surface immediately instead
 * of at commit time (or, worse, at Vercel build time on `main`).
 *
 * Best-effort by design: a hook failure must never block the tool call.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '..');

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const filePath = input?.tool_input?.file_path;
    if (!filePath || !/\.(ts|tsx)$/.test(filePath)) return;

    const absoluteFilePath = path.resolve(repoRoot, filePath);
    if (!absoluteFilePath.startsWith(repoRoot + path.sep)) return;

    const tscBin = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
    if (!fs.existsSync(tscBin)) return;

    spawnSync(process.execPath, [tscBin, '--noEmit'], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  } catch {
    // best-effort — never block the tool call on a hook failure
  }
});

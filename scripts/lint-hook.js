#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook for Write|Edit events.
 * Reads JSON from stdin, extracts the changed file path, and runs the
 * project's own local `prettier --write` then `eslint --fix` on that single
 * file — deliberately the same pair, in the same order, as this repo's
 * `lint-staged` config, so a file edited by Claude Code lands in exactly the
 * state a commit would demand of it.
 *
 * Prettier is not optional here: this project does NOT enable
 * eslint-plugin-prettier as a lint rule, so `eslint --fix` alone leaves
 * formatting untouched and `npm run check` (which includes `format:check`)
 * still fails. Verified live on a probe file, 2026-09-17.
 *
 * Linting one file instead of the whole project keeps the hook fast enough
 * to run on every save; using the repo-local binaries (not global ones)
 * keeps it on the same config CI uses.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '..');
const logFile = path.join(__dirname, 'lint-hook.log');

function log(msg) {
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
}

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let filePath;
  try {
    const input = JSON.parse(raw);
    filePath = input?.tool_input?.file_path;
    if (!filePath || !/\.(ts|tsx|js|jsx)$/.test(filePath)) return;

    const absoluteFilePath = path.resolve(repoRoot, filePath);
    // Only ever lint files inside this repo — a hook firing on an edit to
    // some unrelated file elsewhere on disk must not run this project's
    // eslint config against it.
    if (!absoluteFilePath.startsWith(repoRoot + path.sep)) return;

    const steps = [
      { name: 'prettier', bin: path.join(repoRoot, 'node_modules', 'prettier', 'bin', 'prettier.cjs'), args: ['--write'] },
      { name: 'eslint', bin: path.join(repoRoot, 'node_modules', 'eslint', 'bin', 'eslint.js'), args: ['--fix'] },
    ];

    for (const step of steps) {
      if (!fs.existsSync(step.bin)) continue;

      const result = spawnSync(process.execPath, [step.bin, ...step.args, absoluteFilePath], {
        cwd: repoRoot,
        stdio: 'pipe',
        encoding: 'utf8',
      });

      if (result.error) {
        log(`ERROR spawning ${step.name} for ${filePath}: ${result.error.message}`);
      } else if (result.status !== 0 && result.stderr) {
        log(`${step.name} exited ${result.status} for ${filePath}: ${result.stderr.trim()}`);
      }
    }
  } catch (err) {
    log(`EXCEPTION for ${filePath ?? 'unknown'}: ${err.message}`);
  }
});

// Ralph's own files under .claude/ralph/ — the config it reads, the state
// snapshot it writes, and the single-run lock. Nothing here knows about
// issues, git or the agent; it is pure local bookkeeping for run.js.
//
// Module map for the whole loop: see the header of core.js.

const fs = require('fs');
const path = require('path');

const RALPH_DIR = path.join('.claude', 'ralph');
const CONFIG_PATH = path.join(RALPH_DIR, 'config.json');
const STATE_PATH = path.join(RALPH_DIR, 'state.json');
const LOCK_PATH = path.join(RALPH_DIR, 'run.lock');
const RUNS_ROOT = '.ralph-runs';

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function writeState(patch) {
  let current = {};
  try {
    current = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    // no prior state, start fresh
  }
  fs.mkdirSync(RALPH_DIR, { recursive: true });
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify({ ...current, ...patch }, null, 2) + '\n'
  );
}

// --- lock: refuse to run two orchestrators against the same repo at once ---

function acquireLock() {
  fs.mkdirSync(RALPH_DIR, { recursive: true });
  if (fs.existsSync(LOCK_PATH)) {
    const prior = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    let alive = true;
    try {
      process.kill(prior.pid, 0);
    } catch {
      alive = false;
    }
    if (alive) {
      throw new Error(
        `Another Ralph run is already active (PID ${prior.pid}, started ${prior.startedAt}). Refusing to start a second one.`
      );
    }
    console.log(
      `⚠️ Stale lock from PID ${prior.pid} (no longer running) — taking over.`
    );
  }
  fs.writeFileSync(
    LOCK_PATH,
    JSON.stringify(
      { pid: process.pid, startedAt: new Date().toISOString() },
      null,
      2
    ) + '\n'
  );
}

function releaseLock() {
  try {
    fs.unlinkSync(LOCK_PATH);
  } catch {
    // already gone, fine
  }
}

module.exports = {
  RALPH_DIR,
  CONFIG_PATH,
  STATE_PATH,
  LOCK_PATH,
  RUNS_ROOT,
  loadConfig,
  writeState,
  acquireLock,
  releaseLock,
};

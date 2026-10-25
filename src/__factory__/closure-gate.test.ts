import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// Runs the closure gate and the skill marker of the installed dark-factory
// package against this repository's real .factory/profile.json, the way
// .claude/settings.json wires them. No git command is executed: the hook only
// receives the PreToolUse event JSON.

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
const HOOKS_DIR = path.join(PROJECT_ROOT, 'node_modules/dark-factory/hooks');
const CLOSURE_GATE = path.join(HOOKS_DIR, 'closure-gate.js');
const SKILL_MARKER = path.join(HOOKS_DIR, 'skill-marker.js');
const SESSION_PREFIX = `cards-closure-gate-test-${process.pid}`;

interface GateDecision {
  hookSpecificOutput: { permissionDecision: string };
}

const sessionIds: string[] = [];

const createSessionId = () => {
  const sessionId = `${SESSION_PREFIX}-${sessionIds.length}`;
  sessionIds.push(sessionId);
  return sessionId;
};

interface SkillMarker {
  markerPath: (sessionId: string) => string;
}

const requirePackage = createRequire(import.meta.url);
const { markerPath } = requirePackage(SKILL_MARKER) as SkillMarker;

const runHook = (script: string, event: object) =>
  spawnSync(process.execPath, [script], {
    input: JSON.stringify(event),
    encoding: 'utf8',
    cwd: PROJECT_ROOT,
    env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_ROOT },
  });

const runBash = (sessionId: string, command: string) =>
  runHook(CLOSURE_GATE, {
    session_id: sessionId,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
    cwd: PROJECT_ROOT,
  });

const loadSkill = (sessionId: string, skill: string) =>
  runHook(SKILL_MARKER, {
    session_id: sessionId,
    hook_event_name: 'PostToolUse',
    tool_name: 'Skill',
    tool_input: { skill },
  });

describe('installed dark-factory closure gate', () => {
  afterEach(() => {
    for (const sessionId of sessionIds) {
      fs.rmSync(markerPath(sessionId), { force: true });
    }
    sessionIds.length = 0;
  });

  it('echo git commit is not intercepted', () => {
    const result = runBash(createSessionId(), 'echo git commit -m x');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('grep for git commit is not intercepted', () => {
    const result = runBash(createSessionId(), 'grep "git commit" notes.md');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('git commit without task-lifecycle is blocked', () => {
    const result = runBash(createSessionId(), 'git commit -m x');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('task-lifecycle');
  });

  it('git commit with task-lifecycle asks owner', () => {
    const sessionId = createSessionId();
    const marked = loadSkill(sessionId, 'task-lifecycle');
    expect(marked.status).toBe(0);

    const result = runBash(sessionId, 'git commit -m x');
    expect(result.status).toBe(0);
    const decision = JSON.parse(result.stdout) as GateDecision;
    expect(decision.hookSpecificOutput.permissionDecision).toBe('ask');
  });
});

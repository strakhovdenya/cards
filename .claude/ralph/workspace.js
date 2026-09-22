// Everything that touches the per-issue run directory (`.ralph-runs/issue-N`)
// on disk: cloning it, marking it trusted, installing deps, writing the
// permission profile for each agent pass, and applying the DEL_RALPH file
// renames the agent itself is not allowed to perform.
//
// The three write*Permissions() functions are the enforcement half of the
// prompt's own rules (prompts.js asks; these make it non-optional) — they
// overwrite the SAME settings.local.json before each pass, so the file always
// reflects exactly the pass about to run.
//
// Module map for the whole loop: see the header of core.js.

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { RUNS_ROOT } = require('./config');
const { git, gitPorcelainStatus } = require('./github');
const { changedFilePathsFromPorcelain } = require('./parsing');

// --- per-issue clone (replaces git worktree — see .claude/ralph/README.md) ---

function runDirFor(id) {
  return path.join(RUNS_ROOT, `issue-${id}`);
}

// Never throws — this is a best-effort cleanup, called from both the happy
// path (done/blocked) and error paths. A leftover process the agent started
// in the background (e.g. `npm run dev`, allowed via `Bash(npm run *)`) can
// hold an OS-level lock on files inside runDir well after the agent's own
// turn ends, making `rmSync` fail with EBUSY on Windows. Found live: a real
// BLOCKED run on #321 correctly posted its GitHub comment/label, then this
// call (previously unguarded) threw EBUSY and crashed the whole `run.js`
// process before it could move on to the next queued issue. Cleanup best-
// effort is an acceptable trade-off — a leftover `.ralph-runs/issue-N`
// directory is harmless clutter (the next run for that issue re-clones over
// it via `prepareClone()`'s own `removeRunDirIfExists()` call, or a human
// deletes it manually), whereas crashing the controller mid-loop silently
// drops every issue still queued after the current one.
function removeRunDirIfExists(runDir) {
  if (!fs.existsSync(runDir)) return;
  try {
    fs.rmSync(runDir, { recursive: true, force: true });
  } catch (err) {
    console.log(
      `⚠️ Не удалось удалить ${runDir} (не критично, продолжаю): ${err.message}`
    );
  }
}

function getOriginUrl() {
  return git(['remote', 'get-url', 'origin']);
}

function prepareClone(runDir, baseRef, branchName) {
  fs.mkdirSync(RUNS_ROOT, { recursive: true });
  removeRunDirIfExists(runDir);
  const originUrl = getOriginUrl();
  git(['clone', originUrl, runDir]);
  git(['checkout', '-b', branchName, baseRef], { cwd: runDir });
}

// `claude -p` skips the interactive workspace-trust DIALOG in non-interactive
// mode (confirmed via `claude --help`), but a directory that has never been
// trusted still silently drops permissions.allow entries from BOTH
// .claude/settings.json and settings.local.json ("this workspace has not
// been trusted") — same net effect as being blocked, just without a prompt
// to accept. Found live: every single `.ralph-runs/issue-*` directory ever
// created by this loop (confirmed via ~/.claude.json, including several from
// already-merged issues) has `hasTrustDialogAccepted: false`. Most passes
// (Edit/Write/Bash) apparently don't require it, but `Skill(code-review)`
// does — that's exactly what made #321's post-self-review code-review pass
// silently lose its Skill permission and end without a parseable verdict,
// escalating to a false BLOCKED even though the implementation itself was
// fine. Fixed at the source: mark the runDir trusted before the first
// `claude -p` call against it, the same fix the error message itself points
// at ('set projects[...].hasTrustDialogAccepted: true in ~/.claude.json').
function trustRunDir(runDir) {
  const claudeConfigPath = path.join(os.homedir(), '.claude.json');
  const resolved = path.resolve(runDir).replace(/\\/g, '/');
  // Windows drive-letter casing isn't guaranteed consistent between what
  // Node's path.resolve() produces here and whatever the `claude` CLI itself
  // normalizes a spawned `cwd` to internally — confirmed live: this same
  // machine's ~/.claude.json already has both "D:/projects_js/..." and
  // "d:/projects_js/.../.ralph-runs/issue-215" as separate project keys from
  // earlier runs. Writing both casings is cheap and removes the guesswork —
  // whichever one the CLI actually looks up will be trusted.
  const keys = /^[A-Za-z]:\//.test(resolved)
    ? [
        resolved.charAt(0).toUpperCase() + resolved.slice(1),
        resolved.charAt(0).toLowerCase() + resolved.slice(1),
      ]
    : [resolved];
  let config;
  try {
    config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
  } catch (err) {
    console.log(
      `⚠️ Не удалось прочитать ${claudeConfigPath} для доверия рабочей директории (не критично): ${err.message}`
    );
    return;
  }
  config.projects = config.projects || {};
  for (const key of keys) {
    config.projects[key] = {
      ...(config.projects[key] || {}),
      hasTrustDialogAccepted: true,
    };
  }
  try {
    fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2) + '\n');
  } catch (err) {
    console.log(
      `⚠️ Не удалось записать ${claudeConfigPath} для доверия рабочей директории (не критично): ${err.message}`
    );
  }
}

// A fresh clone has no node_modules at all (gitignored, like any checkout).
// The agent has no `npm install` permission — installing deps is
// environment setup, not part of "implement the issue," so the controller
// does it deterministically before the agent ever runs, not on the agent's
// own turns/time. Found the hard way: a real run against #215 sat silent
// for 23 minutes with almost no diff — most likely stuck on missing deps,
// since plain-text `-p` mode doesn't surface what a blocked/failing Bash
// call was even trying to do.
function installDependencies(runDir) {
  if (!fs.existsSync(path.join(runDir, 'package.json'))) return;
  console.log('📦 npm install...');
  // `npm` is a .cmd shim on Windows — execFileSync needs shell:true to
  // resolve it (unlike git/gh, which are plain .exe). Found via a real
  // ENOENT on a live smoke test.
  execFileSync('npm', ['install'], {
    cwd: runDir,
    stdio: 'inherit',
    shell: true,
  });
}

// A fresh clone only ever gets tracked files — .claude/settings.local.json
// (where a human's personal git*/gh* allow-list would live) never reaches
// it, and that's deliberate here: the agent gets NO git-mutation and NO gh
// permissions at all. It only edits code and reports DONE/BLOCKED; every
// git/gh mutation (commit, push, PR, issue comments/labels) is owned by
// this controller. See .claude/ralph/README.md for why.
// Reads whichever skills are actually installed under `.claude/skills/` in
// the clone (one subdirectory per skill, e.g. `.claude/skills/vitest/`) so
// writeAgentPermissions() can allow exactly those, by name, without this
// file having to hardcode and maintain a list that drifts out of sync with
// `.claude/skills/` every time a skill is added or removed from the repo.
function listInstalledSkillNames(runDir) {
  const skillsDir = path.join(runDir, '.claude', 'skills');
  try {
    return fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    // No .claude/skills/ at all (or unreadable) — not an error, just means
    // no skills to allow.
    return [];
  }
}

function writeAgentPermissions(runDir) {
  // Self-sufficient on purpose — must not depend on whatever happens to be
  // committed in the repo's own .claude/settings.json at clone time (e.g.
  // right after this very redesign, main won't have it yet). Covers exactly
  // what ralph's prompt asks the agent to run.
  // 'Edit' and 'Write' are two separate tools/permissions — Edit only
  // covers modifying an existing file, Write covers creating a new one.
  // Missing 'Write' here once made a real run silently unable to create a
  // new spec file: the Write tool call was denied with nothing to approve
  // it in headless mode, and the agent burned many turns trying to work
  // around it via Bash (echo/heredoc/python/node -e/PowerShell), none of
  // which were allowlisted either.
  const settings = {
    permissions: {
      allow: [
        'Edit',
        'Write',
        // Lets the implementer delegate exploration (e.g. the `research`/
        // `codebase-scan` subagents in .claude/agents/) instead of burning
        // its own turn budget on wide reads — a subagent still runs inside
        // this same runDir under this same settings.local.json, so it's
        // bound by the same deny rules below (.claude/**, docs/**).
        'Agent',
        'Bash(git status:*)',
        'Bash(git diff:*)',
        'Bash(git log:*)',
        // Broad on purpose (not one exact string per invocation) — a real
        // run tried `npm run test -- --testPathPattern=...`, which the
        // narrower exact-match version of this list didn't cover, and burned
        // several turns trying different shell syntax (cd/Set-Location/
        // --prefix) before we noticed. `npm run *`/`npx *` still can't touch
        // git/gh/the filesystem outside runDir — just covers "any npm
        // script, any npx tool, with any flags."
        'Bash(npm run *)',
        'Bash(npx *)',
        // One entry per skill actually installed under `.claude/skills/`
        // (see listInstalledSkillNames()) — the Skill tool needs its own
        // explicit allow entry, unlike Edit/Write/Bash which work off the
        // blanket entries above (same finding as
        // writeCodeReviewPermissions()'s 'Skill(code-review)' below, minus
        // that one being scoped to a single skill on purpose). Without
        // this, an issue that references an installed skill by name (e.g.
        // issue #9 -> `vitest`) would have the implementer silently denied
        // the call and fall back to guessing instead. Scoped to the
        // installed set rather than a blanket 'Skill' — same
        // minimal-privilege reasoning as the code-review pass, just derived
        // automatically instead of hand-maintained.
        ...listInstalledSkillNames(runDir).map((name) => `Skill(${name})`),
      ],
      // Backstop for two of the prompt's own rules — a prompt instruction is
      // only a request, not an enforcement. Deny rules take precedence over
      // the blanket 'Edit'/'Write' allow above, so even if the agent ignores
      // the prompt (or a future prompt edit drops one of these rules), it
      // still cannot touch these paths:
      //  - .claude/** — its own permission files ("don't self-grant access").
      //  - docs/** — database migrations (docs/**/*.sql) and setup notes.
      //    Migrations are applied by hand in the Supabase SQL editor against
      //    the same project the live app uses, so a breaking one takes
      //    production down before any PR is merged: always a human decision
      //    (the prompt's BLOCKED-DB-CHANGE rule already asks the agent to
      //    stop — this makes that non-optional).
      deny: [
        'Edit(.claude/**)',
        'Write(.claude/**)',
        'Edit(docs/**)',
        'Write(docs/**)',
      ],
    },
  };
  const dir = path.join(runDir, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'settings.local.json'),
    JSON.stringify(settings, null, 2) + '\n'
  );
}

// Overwrites the same settings.local.json with a strictly read-only profile
// for the post-DONE self-review pass (see runIssue()) — deliberately no
// 'Edit'/'Write' in `allow` at all (not even denied explicitly; omission is
// enough in headless mode, same as any other unlisted tool). The reviewer's
// only job is to read the diff and run verification commands, never to fix
// anything itself — if it finds a real problem, the whole iteration is
// BLOCKED and a human looks at it, rather than letting the reviewer "helpfully"
// patch its way to a false PASS.
function writeReviewerPermissions(runDir) {
  const settings = {
    permissions: {
      allow: [
        'Bash(git status:*)',
        'Bash(git diff:*)',
        'Bash(git log:*)',
        'Bash(git show:*)',
        'Bash(npm run *)',
        'Bash(npx *)',
      ],
    },
  };
  const dir = path.join(runDir, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'settings.local.json'),
    JSON.stringify(settings, null, 2) + '\n'
  );
}

// Same read-only rationale as writeReviewerPermissions() above, plus explicit
// permission to invoke the `code-review` skill via the Skill tool (not
// allowed by default) — this pass's whole job is to run that skill against
// the diff and report its findings, nothing else. `--fix`/`--comment` are
// deliberately never requested in the prompt (buildCodeReviewPrompt()) even
// though the skill supports them: this pass reports only, the same
// point-fix-then-re-review loop already used for self-review handles fixes,
// so a real human-equivalent second pass reviews the fix too instead of the
// skill silently patching its own finding.
//
// NOTE: the exact permission string for scoping the Skill tool to one named
// skill was not independently verified against a live headless run before
// this was written — if the first real run shows `code-review` being denied
// despite this entry, check the actual permission syntax Claude Code expects
// for Skill invocations (may need `'Skill'` unscoped, or a different pattern
// entirely) and fix this list, the same way writeAgentPermissions()'s
// Bash(npm run *) / Edit-vs-Write split were each found empirically (see
// README.md's "Ещё три находки" section).
function writeCodeReviewPermissions(runDir) {
  const settings = {
    permissions: {
      allow: [
        'Bash(git status:*)',
        'Bash(git diff:*)',
        'Bash(git log:*)',
        'Bash(git show:*)',
        'Bash(npm run *)',
        'Bash(npx *)',
        'Skill(code-review)',
      ],
    },
  };
  const dir = path.join(runDir, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'settings.local.json'),
    JSON.stringify(settings, null, 2) + '\n'
  );
}

// --- controller-owned DEL_RALPH file renames (the agent never deletes/moves
// files itself — see buildTaskRules()) ---

// Marker convention for the one class of filesystem op the agent cannot
// perform (no rm/mv/rename permission — see writeAgentPermissions() and the
// live ISSUE-28 run, 2026-09-18: the agent needed to migrate
// `src/middleware.ts` to Next.js 16's `proxy` convention, could create the
// new file via Write but had no way to remove the old one, and correctly
// reported BLOCKED without touching main). Rather than granting the agent
// Bash(rm)/Bash(mv) directly — which would reopen exactly the class of risk
// ADR-001/this file's git-gh restriction exists to close (an unattended LLM
// given a free-form destructive filesystem command) — the agent instead
// leaves a first-line marker comment on the file it wants gone
// (`DEL_RALPH: <reason>`) and the CONTROLLER, deterministic code below,
// physically renames it after the agent's turn ends.
const DEL_RALPH_MARKER_RE = /DEL_RALPH:\s*(.+)/;

// Blocks the event loop for `ms` — acceptable here because the whole
// controller is a synchronous CLI loop (one `claude -p` at a time, nothing
// else running concurrently), and the delay only ever fires on the rare
// retry path below, not on every call.
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Root-caused live on ISSUE-28 (2026-09-18): right after `npm run build`
// fails inside the agent's own turn (Node worker pool spinning up/tearing
// down for "Generating static pages using N workers"), a *separate* Node
// process reading the same file can transiently get EPERM/EBUSY on
// Windows — reproduced directly on this machine: a plain `node -e` in the
// same shell failed with "Permission denied" immediately after a `next
// build` run, then succeeded on the very next attempt with no code change.
// The original unconditional `catch { continue; }` treated that exactly
// like ENOENT (file legitimately deleted) and silently dropped the file
// from `marked` — no rename, no error, nothing in the log. A short retry
// clears it in practice; anything still failing after retries is now a
// real problem worth surfacing (see the `console.log` below), not a
// swallowed exception. Only 100-350ms of total worst-case delay, and only
// on the failure path.
const READ_RETRY_DELAYS_MS = [100, 250];

// Only inspects files `porcelain` (a fresh `git status --porcelain`) says
// actually changed in this run — never scans the whole tree — so a marker
// left over from an unrelated, already-committed file can't be picked up by
// accident.
function findDelRalphMarkedFiles(runDir, porcelain) {
  const marked = [];
  for (const relPath of changedFilePathsFromPorcelain(porcelain)) {
    const absPath = path.join(runDir, relPath);
    let content;
    let lastErr;
    for (let attempt = 0; ; attempt++) {
      try {
        content = fs.readFileSync(absPath, 'utf8');
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        // ENOENT is the expected case (file was deleted as part of the
        // diff) — never worth retrying, it will never appear.
        if (err.code === 'ENOENT') break;
        if (attempt >= READ_RETRY_DELAYS_MS.length) break;
        sleepSync(READ_RETRY_DELAYS_MS[attempt]);
      }
    }
    if (lastErr) {
      // Anything left after retries (permission issues, a genuinely stuck
      // lock, etc.) — surface it instead of silently dropping the file from
      // `marked`, which was what hid the whole DEL_RALPH mechanism not
      // firing on ISSUE-28 with no trace in the log.
      if (lastErr.code !== 'ENOENT') {
        console.log(
          `⚠️ DEL_RALPH: не удалось прочитать ${relPath} для проверки маркера после повторных попыток (${lastErr.code || lastErr.message}) — файл пропущен`
        );
      }
      continue;
    }
    const m = DEL_RALPH_MARKER_RE.exec(content.slice(0, 200));
    if (m) marked.push({ relPath, reason: m[1].trim() });
  }
  return marked;
}

// Renames in place to `del_ralph_<original name>`, same directory — never an
// actual delete. Content is fully preserved and the change shows up as an
// ordinary rename in `git status`/the eventual PR diff, so nothing is lost
// and a human reviewing the PR sees exactly what moved and why (the
// PR/commit still carries the agent's own `DEL_RALPH: <reason>` comment
// inside the renamed file until someone deletes it for real).
function applyDelRalphRenames(runDir, marked) {
  return marked.map(({ relPath, reason }) => {
    const newRelPath = path.join(
      path.dirname(relPath),
      `del_ralph_${path.basename(relPath)}`
    );
    fs.renameSync(path.join(runDir, relPath), path.join(runDir, newRelPath));
    return { from: relPath, to: newRelPath, reason };
  });
}

// Plain synchronous shell-out, same pattern as installDependencies() — run
// by the controller itself, never through the agent's own Bash(npm run *)
// permission, because the point is to verify the state AFTER a rename the
// agent's own in-turn `npm run check`/`build` could not have seen (it
// necessarily ran against the old, still-colliding file layout).
function runVerificationChecks(runDir) {
  try {
    execFileSync('npm', ['run', 'check'], {
      cwd: runDir,
      stdio: 'inherit',
      shell: true,
    });
    execFileSync('npm', ['run', 'build'], {
      cwd: runDir,
      stdio: 'inherit',
      shell: true,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// The agent is never allowed to run `npm install` itself (see prompts.js's
// task rules and the permission profiles above — only `Bash(npm run *)` is
// allowed) because the controller already installed deps once at clone time
// and re-running it mid-turn would be redundant. But that assumption breaks
// the moment an issue needs a NEW dependency: the agent's only way to
// declare one is hand-editing `package.json` (Edit/Write), which leaves
// `package-lock.json` stale. `npm run check`/`build` don't catch this —
// neither tsc/eslint nor `next build` verifies package.json and
// package-lock.json actually agree, only `npm ci` does, and Ralph never
// runs `npm ci`. Root-caused live on ISSUE-10 (2026-09-18): the PR shipped
// with `package.json` gaining `@playwright/test` but an untouched
// `package-lock.json`; every local check was green (against the already-warm
// `node_modules` from clone time), and CI's `npm ci` failed on all three
// jobs with `Missing: @playwright/test ... from lock file`. Same
// backstop pattern as applyDelRalphMarkersIfAny() below: something the agent
// cannot safely be trusted to do itself, done deterministically by the
// controller right after its turn, before the final build verification.
function syncLockfileIfPackageJsonChanged(runDir) {
  let porcelain;
  try {
    porcelain = gitPorcelainStatus({ cwd: runDir });
  } catch (err) {
    return {
      ok: false,
      ran: false,
      error: `git status failed: ${err.message}`,
    };
  }
  const touchedPackageJson = changedFilePathsFromPorcelain(porcelain).some(
    (f) => f === 'package.json' || f.endsWith('/package.json')
  );
  if (!touchedPackageJson) return { ok: true, ran: false };

  console.log(
    '🔒 package.json изменён этим прогоном — пересобираю package-lock.json (npm install) ' +
      'контроллером, чтобы npm ci в CI не упал на рассинхроне (см. инцидент ISSUE-10 в README.md)...'
  );
  try {
    execFileSync('npm', ['install'], {
      cwd: runDir,
      stdio: 'inherit',
      shell: true,
    });
    return { ok: true, ran: true };
  } catch (err) {
    return { ok: false, ran: true, error: err.message };
  }
}

// Called after every agent turn that could plausibly have left a
// DEL_RALPH-marked file behind (the initial DONE, and each fix-pass DONE in
// the two review loops in runIssue()). No-op (`applied: false`) when nothing
// is marked — the common case for almost every issue. When something IS
// marked, renames it and re-verifies the build itself; a non-null
// `blockedReason` means the caller must treat this exactly like an agent
// BLOCKED (post the comment, clean up runDir, stop) — a rename that leaves
// the build red is not safe to hand off as a PR.
function applyDelRalphMarkersIfAny(runDir, porcelain) {
  const marked = findDelRalphMarkedFiles(runDir, porcelain);
  if (marked.length === 0) return { blockedReason: null, applied: false };

  const renames = applyDelRalphRenames(runDir, marked);
  const summary = renames
    .map((r) => `${r.from} → ${r.to} (${r.reason})`)
    .join('; ');
  console.log(`🗂️ Контроллер переименовал по маркеру DEL_RALPH: ${summary}`);

  const verify = runVerificationChecks(runDir);
  if (!verify.ok) {
    return {
      blockedReason: `После переименования файлов по маркеру DEL_RALPH (${summary}) npm run check/build не зелёные: ${verify.error}`,
      applied: true,
    };
  }
  return { blockedReason: null, applied: true };
}

module.exports = {
  runDirFor,
  removeRunDirIfExists,
  getOriginUrl,
  prepareClone,
  trustRunDir,
  installDependencies,
  listInstalledSkillNames,
  writeAgentPermissions,
  writeReviewerPermissions,
  writeCodeReviewPermissions,
  DEL_RALPH_MARKER_RE,
  findDelRalphMarkedFiles,
  applyDelRalphRenames,
  runVerificationChecks,
  applyDelRalphMarkersIfAny,
  syncLockfileIfPackageJsonChanged,
};

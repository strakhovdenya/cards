// Ralph's state machine: one GitHub issue, start to finish. Everything below
// is orchestration — each concrete capability lives in its own module.
//
// Module map (each file answers one question):
//   config.js     .claude/ralph/ bookkeeping — config, state snapshot, lock
//   github.js     every `git`/`gh` call — issue classification + all mutations
//   workspace.js  the .ralph-runs/issue-N clone — setup, permissions, DEL_RALPH
//   prompts.js    every word the agent is told, for all four passes
//   parsing.js    pure parsing of the agent's output and of git porcelain
//   agent.js      spawning `claude -p` and streaming its events
//
// The flow runIssue() implements, and why it is shaped this way:
//   1. clone + trust + npm install + permissions      (workspace.js)
//   2. implementer pass -> DONE / BLOCKED             (agent.js + prompts.js)
//   3. DEL_RALPH renames the agent could not perform  (workspace.js)
//   4. self-review pass, up to MAX_REVIEW_FIX_ATTEMPTS point-fix cycles
//   5. code-review skill pass, own separate budget
//   6. AC reconciliation, issue comment, commit, push, PR   (github.js)
// Steps 4 and 5 exist because green tsc/lint/tests do NOT prove the diff
// satisfies the issue — see .claude/ralph/README.md. The human still merges.

const {
  git,
  gitPorcelainStatus,
  branchNameFor,
  classify,
  resolveBaseRef,
  postBlockedComment,
  postTestEvidenceComment,
  checkOffAcceptanceCriteria,
  postOutOfScopeNote,
  commitChanges,
  pushBranch,
  createPr,
} = require('./github');
const {
  runDirFor,
  removeRunDirIfExists,
  prepareClone,
  trustRunDir,
  installDependencies,
  listInstalledSkillNames,
  writeAgentPermissions,
  writeReviewerPermissions,
  writeCodeReviewPermissions,
  applyDelRalphMarkersIfAny,
  runVerificationChecks,
  syncLockfileIfPackageJsonChanged,
} = require('./workspace');
const {
  buildPrompt,
  buildFixPrompt,
  buildReviewPrompt,
  buildCodeReviewPrompt,
} = require('./prompts');
const {
  hasCodeChanges,
  parseVerdict,
  parseReviewVerdict,
  parseCodeReviewVerdict,
  extractAcceptanceCriteriaItems,
  parseAcceptanceCriteriaSelfReport,
  reconcileAcceptanceCriteria,
} = require('./parsing');
const { runAgent } = require('./agent');

// Fallback when config.json has no `reviewMaxTurns` of its own — deliberately
// smaller than the implementer's own maxTurns, since the reviewer only reads
// a diff and runs read-only verification commands, it never edits anything,
// so it needs far fewer turns regardless of how large config.maxTurns is set
// for implementation work. Configurable per-run (`reviewMaxTurns` in
// config.json) rather than hardcoded, same as maxIterations/maxTurns/
// branchPrefix already are.
const DEFAULT_REVIEW_MAX_TURNS = 40;

// How many review-FAIL -> point-fix -> re-review cycles to allow before
// giving up and treating the iteration as blocked. Bounds cost/turns on a
// review that keeps finding new things — 4 gives a genuine chance to
// self-correct on multiple distinct findings in a row without turning one
// issue into an unbounded loop.
const MAX_REVIEW_FIX_ATTEMPTS = 4;

// Same idea, separate budget, for the post-self-review code-review pass below
// (prompts.js's buildCodeReviewPrompt() + workspace.js's
// writeCodeReviewPermissions()). Deliberately its own
// constant, not shared with MAX_REVIEW_FIX_ATTEMPTS — the two passes check
// different things (self-review: Key Invariants/AC/false-negative tests;
// code-review: correctness + reuse/simplification/efficiency, via the
// `code-review` skill) and run as two independent loops in sequence. Sharing
// one counter between them would let a self-review fix cycle silently starve
// the code-review pass's own retry budget (or vice versa) for no reason tied
// to either pass's actual difficulty.
const MAX_CODE_REVIEW_FIX_ATTEMPTS = 2;

// --- one issue, full state machine ---

async function runIssue(config, byId, chosen) {
  const branchName = branchNameFor(config, chosen.id, chosen.title);
  const baseRef = resolveBaseRef(config, byId, chosen);
  const runDir = runDirFor(chosen.id);
  const reviewMaxTurns = config.reviewMaxTurns ?? DEFAULT_REVIEW_MAX_TURNS;

  console.log(`🌱 Клон ${runDir}, ветка ${branchName} от ${baseRef}.`);
  let skillNames = [];
  try {
    prepareClone(runDir, baseRef, branchName);
    trustRunDir(runDir);
    writeAgentPermissions(runDir);
    installDependencies(runDir);
    // Same source writeAgentPermissions() itself reads to build the Skill
    // allow-list — computed once here and threaded into every prompt below
    // (initial + both fix passes) so the agent is actually told which
    // skills it's allowed to use, not just silently granted the permission.
    skillNames = listInstalledSkillNames(runDir);
  } catch (err) {
    return { status: 'prepare_failed', error: err.message };
  }

  const prompt = buildPrompt(chosen, config.maxTurns, skillNames);
  const agentResult = await runAgent(prompt, runDir, config.maxTurns);
  if (!agentResult.ok) {
    return { status: 'agent_failed', error: agentResult.error, runDir };
  }

  let verdict = parseVerdict(agentResult.output);
  // `verdict.type`/`verdict.summary` stay the ORIGINAL implementer's DONE for
  // the rest of this function — they drive the commit message, PR title, and
  // the issue comment's headline, and those must describe the whole task, not
  // whichever review pass happened to patch it last. A review-driven fix (see
  // the two loops below) is real work worth recording, but as a footnote, not
  // as the headline: it usually corrects one narrow finding (e.g. one
  // inaccurate comment) against an implementation that is otherwise the
  // actual substance of the PR. Each fix's own summary is collected in
  // `reviewFixSummaries` instead and surfaced as a separate list in the issue
  // comment (see `postTestEvidenceComment`) — found via a misleading PR title
  // after issue #13's run overwrote it with a one-line comment-wording fix.
  const reviewFixSummaries = [];
  // Tracks whichever agent invocation produced the CURRENT self-report — a
  // fix pass's own self-report supersedes the original DONE's for Acceptance
  // Criteria reconciliation (see the two reassignments below), since it
  // reflects the code as it now actually stands. This is deliberately
  // independent from `verdict` above: AC reconciliation wants the latest
  // state, the commit/PR headline wants the original intent.
  let finalOutput = agentResult.output;

  if (verdict.kind === 'blocked' || verdict.kind === 'blocked-db-change') {
    try {
      postBlockedComment(
        chosen.id,
        verdict.reason,
        verdict.kind === 'blocked-db-change'
      );
    } catch (err) {
      console.log(
        `⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`
      );
    }
    removeRunDirIfExists(runDir);
    return {
      status: 'blocked',
      reason: verdict.reason,
      dbChange: verdict.kind === 'blocked-db-change',
    };
  }

  if (verdict.kind !== 'done') {
    return {
      status: 'agent_failed',
      error: 'agent did not return DONE or BLOCKED',
      runDir,
      output: agentResult.output.slice(-2000),
    };
  }

  let diff = gitPorcelainStatus({ cwd: runDir });
  if (!diff) {
    return {
      status: 'validate_failed',
      error: 'agent said DONE but produced no diff',
      runDir,
    };
  }

  {
    const delRalph = applyDelRalphMarkersIfAny(runDir, diff);
    if (delRalph.blockedReason) {
      try {
        postBlockedComment(chosen.id, delRalph.blockedReason, false);
      } catch (err) {
        console.log(
          `⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`
        );
      }
      removeRunDirIfExists(runDir);
      return { status: 'blocked', reason: delRalph.blockedReason };
    }
    if (delRalph.applied) diff = gitPorcelainStatus({ cwd: runDir });
  }

  // Post-DONE self-review — only for diffs that actually touch code, not
  // pure docs (see hasCodeChanges()/DOC_ONLY_PATH_PATTERNS in parsing.js). A
  // doc-only change like #271/#272/#273 has no code-level Key Invariant to
  // silently violate, so a second full agent invocation on it is pure cost.
  // Exists because tsc/lint/test all green does not prove a CODE diff
  // actually satisfies the issue's own Key Invariants — found on ISSUE-287's
  // own autonomous run (see buildReviewPrompt()'s comment).
  //
  // On a real finding, this does NOT jump straight to BLOCKED — it gives the
  // implementer up to MAX_REVIEW_FIX_ATTEMPTS point-fix-then-re-review
  // cycles first (a SEPARATE agent invocation per attempt, framed around
  // fixing exactly what was found — buildFixPrompt()). Only exhausting that
  // budget (or the fixer itself saying BLOCKED, or an unparseable review
  // verdict) escalates to the same BLOCKED handling as an implementer
  // BLOCKED: no commit, no PR, `ralph-blocked` label so it isn't silently
  // re-picked next run.
  if (hasCodeChanges(diff)) {
    let reviewAttempt = 0;
    for (;;) {
      console.log(
        `🔎 Пост-DONE self-review для issue #${chosen.id} (попытка ${reviewAttempt + 1}/${MAX_REVIEW_FIX_ATTEMPTS + 1})...`
      );
      writeReviewerPermissions(runDir);
      const diffText = git(['diff', 'HEAD'], { cwd: runDir });
      const reviewPrompt = buildReviewPrompt(chosen, diffText);
      const reviewAgentResult = await runAgent(
        reviewPrompt,
        runDir,
        reviewMaxTurns
      );
      if (!reviewAgentResult.ok) {
        return {
          status: 'review_failed',
          error: reviewAgentResult.error,
          runDir,
        };
      }

      const reviewVerdict = parseReviewVerdict(reviewAgentResult.output);

      if (reviewVerdict.kind === 'pass') {
        console.log(
          `✅ Self-review пройден для issue #${chosen.id}${reviewAttempt > 0 ? ` (после ${reviewAttempt} фикс-итераци${reviewAttempt === 1 ? 'и' : 'й'})` : ''}.`
        );
        break;
      }

      const unparseable = reviewVerdict.kind !== 'fail';
      const outOfAttempts = reviewAttempt >= MAX_REVIEW_FIX_ATTEMPTS;

      if (unparseable || outOfAttempts) {
        const reason = unparseable
          ? 'Self-review (Ralph loop code-review pass) did not return a clear PASS/FAIL verdict — treating as blocked out of caution.'
          : `Self-review (Ralph loop code-review pass) still found a real issue after ${reviewAttempt} fix attempt(s): ${reviewVerdict.reason}`;
        try {
          postBlockedComment(chosen.id, reason, false);
        } catch (err) {
          console.log(
            `⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`
          );
        }
        removeRunDirIfExists(runDir);
        return { status: 'review_blocked', reason };
      }

      // Real, fixable-in-principle finding, and attempts remain — try a
      // point fix. Restore full Edit/Write permissions (the
      // writeReviewerPermissions() call above stripped them) before running
      // the fixer.
      console.log(
        `🔧 Self-review нашёл проблему для issue #${chosen.id}, пробую точечный фикс: ${reviewVerdict.reason}`
      );
      writeAgentPermissions(runDir);
      const fixPrompt = buildFixPrompt(
        chosen,
        reviewVerdict.reason,
        config.maxTurns,
        skillNames
      );
      const fixAgentResult = await runAgent(fixPrompt, runDir, config.maxTurns);
      if (!fixAgentResult.ok) {
        return { status: 'agent_failed', error: fixAgentResult.error, runDir };
      }

      const fixVerdict = parseVerdict(fixAgentResult.output);

      if (
        fixVerdict.kind === 'blocked' ||
        fixVerdict.kind === 'blocked-db-change'
      ) {
        try {
          postBlockedComment(
            chosen.id,
            fixVerdict.reason,
            fixVerdict.kind === 'blocked-db-change'
          );
        } catch (err) {
          console.log(
            `⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`
          );
        }
        removeRunDirIfExists(runDir);
        return {
          status: 'blocked',
          reason: fixVerdict.reason,
          dbChange: fixVerdict.kind === 'blocked-db-change',
        };
      }

      if (fixVerdict.kind !== 'done') {
        return {
          status: 'agent_failed',
          error: 'fix agent did not return DONE or BLOCKED',
          runDir,
          output: fixAgentResult.output.slice(-2000),
        };
      }

      // Fix applied — re-verify there's still an actual diff, record the
      // fixer's own summary as a footnote (see `reviewFixSummaries` above —
      // `verdict` itself is NOT reassigned, it stays the original DONE for
      // commit/PR-title purposes), take its self-report as current for AC
      // reconciliation, and loop back to review it again from scratch.
      diff = gitPorcelainStatus({ cwd: runDir });
      if (!diff) {
        return {
          status: 'validate_failed',
          error: 'fix agent said DONE but produced no diff',
          runDir,
        };
      }
      {
        const delRalph = applyDelRalphMarkersIfAny(runDir, diff);
        if (delRalph.blockedReason) {
          try {
            postBlockedComment(chosen.id, delRalph.blockedReason, false);
          } catch (err) {
            console.log(
              `⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`
            );
          }
          removeRunDirIfExists(runDir);
          return { status: 'blocked', reason: delRalph.blockedReason };
        }
        if (delRalph.applied) diff = gitPorcelainStatus({ cwd: runDir });
      }
      reviewFixSummaries.push(fixVerdict.summary);
      finalOutput = fixAgentResult.output;
      reviewAttempt++;
    }
  }

  // Post-self-review code-review pass (buildCodeReviewPrompt()) — runs only
  // once self-review above has already passed, as a second, independent
  // check covering what self-review explicitly excludes (style/simplification/
  // reuse — see buildCodeReviewPrompt()'s comment). Same doc-only skip and
  // same "point-fix, then re-review, up to a bounded attempt count before
  // BLOCKED" shape as the self-review loop above, but with its own separate
  // budget (MAX_CODE_REVIEW_FIX_ATTEMPTS) so the two passes can't starve each
  // other's retry budget. `diff` is re-checked fresh here (not reused from
  // before the self-review loop) since a self-review-triggered fix may have
  // changed what's actually in the working tree.
  if (hasCodeChanges(diff)) {
    let codeReviewAttempt = 0;
    for (;;) {
      console.log(
        `🔎 Пост-self-review code-review (skill) для issue #${chosen.id} (попытка ${codeReviewAttempt + 1}/${MAX_CODE_REVIEW_FIX_ATTEMPTS + 1})...`
      );
      writeCodeReviewPermissions(runDir);
      const codeReviewPrompt = buildCodeReviewPrompt(chosen);
      const codeReviewAgentResult = await runAgent(
        codeReviewPrompt,
        runDir,
        reviewMaxTurns
      );
      if (!codeReviewAgentResult.ok) {
        return {
          status: 'code_review_failed',
          error: codeReviewAgentResult.error,
          runDir,
        };
      }

      const codeReviewVerdict = parseCodeReviewVerdict(
        codeReviewAgentResult.output
      );

      if (codeReviewVerdict.kind === 'pass') {
        console.log(
          `✅ Code-review (skill) пройден для issue #${chosen.id}${codeReviewAttempt > 0 ? ` (после ${codeReviewAttempt} фикс-итераци${codeReviewAttempt === 1 ? 'и' : 'й'})` : ''}.`
        );
        break;
      }

      if (codeReviewVerdict.kind === 'pass-out-of-scope') {
        console.log(
          `✅ Code-review (skill) пройден для issue #${chosen.id} — есть находки вне скоупа этой issue, не блокируют: ${codeReviewVerdict.reason}`
        );
        try {
          postOutOfScopeNote(chosen.id, codeReviewVerdict.reason);
        } catch (err) {
          console.log(
            `⚠️ Не удалось записать out-of-scope находку в issue #${chosen.id}: ${err.message}`
          );
        }
        break;
      }

      const unparseable = codeReviewVerdict.kind !== 'fail';
      const outOfAttempts = codeReviewAttempt >= MAX_CODE_REVIEW_FIX_ATTEMPTS;

      if (unparseable || outOfAttempts) {
        const reason = unparseable
          ? 'Post-self-review code-review pass (Ralph loop, code-review skill) did not return a clear PASS/FAIL verdict — treating as blocked out of caution.'
          : `Code-review pass (Ralph loop, code-review skill) still found a real issue after ${codeReviewAttempt} fix attempt(s): ${codeReviewVerdict.reason}`;
        try {
          postBlockedComment(chosen.id, reason, false);
        } catch (err) {
          console.log(
            `⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`
          );
        }
        removeRunDirIfExists(runDir);
        return { status: 'code_review_blocked', reason };
      }

      console.log(
        `🔧 Code-review (skill) нашёл проблему для issue #${chosen.id}, пробую точечный фикс: ${codeReviewVerdict.reason}`
      );
      writeAgentPermissions(runDir);
      const codeReviewFixPrompt = buildFixPrompt(
        chosen,
        codeReviewVerdict.reason,
        config.maxTurns,
        skillNames
      );
      const codeReviewFixAgentResult = await runAgent(
        codeReviewFixPrompt,
        runDir,
        config.maxTurns
      );
      if (!codeReviewFixAgentResult.ok) {
        return {
          status: 'agent_failed',
          error: codeReviewFixAgentResult.error,
          runDir,
        };
      }

      const codeReviewFixVerdict = parseVerdict(
        codeReviewFixAgentResult.output
      );

      if (
        codeReviewFixVerdict.kind === 'blocked' ||
        codeReviewFixVerdict.kind === 'blocked-db-change'
      ) {
        try {
          postBlockedComment(
            chosen.id,
            codeReviewFixVerdict.reason,
            codeReviewFixVerdict.kind === 'blocked-db-change'
          );
        } catch (err) {
          console.log(
            `⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`
          );
        }
        removeRunDirIfExists(runDir);
        return {
          status: 'blocked',
          reason: codeReviewFixVerdict.reason,
          dbChange: codeReviewFixVerdict.kind === 'blocked-db-change',
        };
      }

      if (codeReviewFixVerdict.kind !== 'done') {
        return {
          status: 'agent_failed',
          error: 'code-review fix agent did not return DONE or BLOCKED',
          runDir,
          output: codeReviewFixAgentResult.output.slice(-2000),
        };
      }

      diff = gitPorcelainStatus({ cwd: runDir });
      if (!diff) {
        return {
          status: 'validate_failed',
          error: 'code-review fix agent said DONE but produced no diff',
          runDir,
        };
      }
      {
        const delRalph = applyDelRalphMarkersIfAny(runDir, diff);
        if (delRalph.blockedReason) {
          try {
            postBlockedComment(chosen.id, delRalph.blockedReason, false);
          } catch (err) {
            console.log(
              `⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`
            );
          }
          removeRunDirIfExists(runDir);
          return { status: 'blocked', reason: delRalph.blockedReason };
        }
        if (delRalph.applied) diff = gitPorcelainStatus({ cwd: runDir });
      }
      // Same reasoning as the self-review fix loop above: `verdict` is not
      // reassigned, only its summary is recorded as a footnote.
      reviewFixSummaries.push(codeReviewFixVerdict.summary);
      finalOutput = codeReviewFixAgentResult.output;
      codeReviewAttempt++;
    }
  }

  // Final mandatory build/check verification — the controller's own gate,
  // run unconditionally right before a PR can be created, independent of
  // whatever the agent self-reported or a review pass accepted as "expected
  // intermediate state". Exists because ISSUE-28 (2026-09-18) shipped a PR
  // with a failing `npm run build` (E900: middleware.ts + proxy.ts coexist)
  // that every pass along the way waved through — self-review and the
  // code-review skill both accepted "the controller will rename the
  // DEL_RALPH-marked file" as sufficient without anyone actually re-running
  // the build against the final state, and applyDelRalphMarkersIfAny() only
  // verifies when it finds a marker to act on, so a silent miss in marker
  // detection (or any other reason the tree ends up unbuildable) had nothing
  // left to catch it before the PR shipped. Skipped for doc-only diffs, same
  // as the two review passes above — there is no build to break.
  if (hasCodeChanges(diff)) {
    // Backstop for a second, narrower gap the agent cannot close itself: it
    // has no `npm install` permission (prompts.js), so the only way it can
    // add a NEW dependency is hand-editing `package.json` — which leaves
    // `package-lock.json` stale. Neither `npm run check` nor `npm run build`
    // notices, because both run against the clone's already-installed
    // `node_modules`; only `npm ci` (which Ralph never runs) checks the two
    // files actually agree. Root-caused live on ISSUE-10 (2026-09-18): the
    // PR shipped with `package.json` gaining `@playwright/test` and every
    // local check green, then failed all three CI jobs on `npm ci`. Must run
    // BEFORE runVerificationChecks() below so a lockfile-driven `npm install`
    // failure is caught here, with its own clearer reason, instead of
    // surfacing as a confusing downstream `npm run build` failure.
    const lockfileSync = syncLockfileIfPackageJsonChanged(runDir);
    if (!lockfileSync.ok) {
      const reason = `Не удалось синхронизировать package-lock.json после изменения package.json: ${lockfileSync.error}`;
      try {
        postBlockedComment(chosen.id, reason, false);
      } catch (err) {
        console.log(
          `⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`
        );
      }
      removeRunDirIfExists(runDir);
      return { status: 'blocked', reason };
    }

    const finalVerify = runVerificationChecks(runDir);
    if (!finalVerify.ok) {
      const reason = `Финальная проверка npm run check/build перед коммитом не прошла: ${finalVerify.error}`;
      try {
        postBlockedComment(chosen.id, reason, false);
      } catch (err) {
        console.log(
          `⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`
        );
      }
      removeRunDirIfExists(runDir);
      return { status: 'blocked', reason };
    }
  }

  // Acceptance Criteria reconciliation (see parsing.js's
  // extractAcceptanceCriteriaItems()/parseAcceptanceCriteriaSelfReport()/
  // reconcileAcceptanceCriteria()) —
  // the only place the controller ever checks off an issue's AC checkboxes,
  // and only when the agent's own self-report is a complete, honest 1:1 match
  // against the issue's real AC list. A partial match just leaves the boxes
  // unchecked for whoever reviews later — never blocks or changes `verdict`/
  // the PR outcome. The reconciliation result feeds into the single combined
  // comment posted below (postTestEvidenceComment) — one combined comment per
  // DONE, so a batch run's issue history carries one Ralph comment per issue.
  let acItems = [];
  let selfReport = [];
  let allCovered = false;
  // Deliberately separate from `allCovered`: that's just what the self-report
  // reconciled to (used for the ⏳/✅ marks per item and the comment header
  // wording), whereas this tracks whether `gh issue edit` actually succeeded.
  // If reconciliation says allCovered but the edit call itself throws (e.g. a
  // transient `gh` failure), the comment must NOT claim the boxes were
  // checked — found by re-reading this code, not a live failure — the
  // original version fell into the catch block below with `allCovered`
  // already `true` from the line above the throw, which would have posted a
  // "чек-боксы отмечены автоматически" comment even though the edit failed.
  let checkedOff = false;
  try {
    acItems = extractAcceptanceCriteriaItems(chosen.body);
    if (acItems.length > 0) {
      selfReport = parseAcceptanceCriteriaSelfReport(finalOutput);
      ({ allCovered } = reconcileAcceptanceCriteria(acItems, selfReport));
      if (allCovered) {
        checkOffAcceptanceCriteria(chosen.id);
        checkedOff = true;
      }
    }
  } catch (err) {
    console.log(
      `⚠️ Не удалось сверить/отметить Acceptance Criteria для issue #${chosen.id}: ${err.message}`
    );
  }

  try {
    postTestEvidenceComment(
      chosen,
      verdict,
      branchName,
      acItems,
      selfReport,
      allCovered,
      checkedOff,
      reviewFixSummaries
    );
  } catch (err) {
    console.log(
      `⚠️ Не удалось запостить test evidence комментарий в issue #${chosen.id}: ${err.message}`
    );
  }

  let commitMessage;
  try {
    commitMessage = commitChanges(runDir, chosen, verdict);
  } catch (err) {
    return { status: 'commit_failed', error: err.message, runDir };
  }

  try {
    pushBranch(runDir, branchName);
  } catch (err) {
    return { status: 'push_failed', error: err.message, runDir };
  }

  let pr;
  try {
    pr = createPr(chosen, branchName, baseRef, commitMessage);
  } catch (err) {
    return { status: 'pr_failed', error: err.message, runDir };
  }

  removeRunDirIfExists(runDir);
  return { status: 'done', pr };
}

module.exports = {
  DEFAULT_REVIEW_MAX_TURNS,
  MAX_REVIEW_FIX_ATTEMPTS,
  MAX_CODE_REVIEW_FIX_ATTEMPTS,
  runIssue,
};

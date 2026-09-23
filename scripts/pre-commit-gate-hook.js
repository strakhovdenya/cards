#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook for Bash `git commit` / `git push` invocations.
 *
 * Forces a real permission prompt shown to the human (via
 * hookSpecificOutput.permissionDecision: "ask") with the two checks that
 * actually protect production in this repo — `main` auto-deploys to Vercel,
 * and there is no test suite, so a green-looking commit is not evidence of
 * anything by itself.
 *
 * Deliberately short: this is a reminder, not a workflow. Non-commit/push
 * Bash commands pass through untouched (no output at all).
 */
let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const command = input?.tool_input?.command;
    if (!command) return;

    let reason = null;
    if (/\bgit\s+commit\b/.test(command)) {
      reason =
        'Before committing: (1) has `npm run check` been run and passed on this diff? ' +
        '(2) has the user been asked whether to run /code-review first? ' +
        '(3) were the metaskills (js-conventions, js-gof, vitest for tests) loaded ' +
        'before writing code, and was the diff checked against them? ' +
        'Confirm all three actually happened in this turn before approving.';
    } else if (/\bgit\s+push\b/.test(command)) {
      reason =
        'Before pushing: this branch becomes a PR, and merging it deploys to production. ' +
        'Does the PR body include "Closes #<n>", and is the change safe for the live ' +
        'Supabase schema (additive, not breaking)? Confirm before approving.';
    }

    if (!reason) return;

    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: reason,
        },
      })
    );
  } catch {
    // Malformed input — do not block on a hook bug, let the tool call proceed.
  }
});

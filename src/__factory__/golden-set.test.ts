import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

// Structural check of the Cards golden set (profile verifier.goldenDir) with the
// engine of the installed dark-factory package: readCases/checkGoldenSet and
// the closed reason-code list of its check registry. No model, network, git
// or Docker: the check reads the case files only. The same validateGoldenSet
// runs on the real set and on corrupted copies of it, so a broken set is
// rejected here instead of turning into a skipped case of the paid eval.

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
const FACTORY_DIR = path.join(PROJECT_ROOT, 'node_modules/dark-factory');
const VERIFIER_DIR = path.join(PROJECT_ROOT, '.github/verifier');
const OVERLAY_FILE = path.join(VERIFIER_DIR, 'issue-contract.overlay.json');
const TMP_PREFIX = path.join(os.tmpdir(), 'cards-golden-set-');

const SOURCE_PR = 80;
const PASS_CASE = '80';
const MODEL_FAIL_CASE = '80-model-fail';
const SCOPE_FAIL_CASE = '80-out-of-scope';
const MODEL_KIND = 'doc_required_checks_drift';
const SCOPE_KIND = 'file_outside_affects';
const CRITERION_FAILED = 'criterion_failed';
const OUT_OF_SCOPE_FILE = 'out_of_scope_file';
const SHARED_INPUTS = ['issue.md', 'ci.json', 'exceptions.json'];
const COMPUTED_TYPES = ['ci', 'absence'];
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const PATCH_FILE_HEADER = /^diff --git a\/(\S+) b\/(\S+)\r?$/gm;

interface GoldenCase {
  name: string;
  expected: 'PASS' | 'FAIL';
  pairOf: string | null;
  mutationKind: string | null;
  criterionId: string | null;
  reasonCode: string | null;
  isValid: boolean;
}

interface GoldenSetCheck {
  unpairedPass: string[];
  missingPairs: number;
  missingKinds: string[];
}

interface VerifierEval {
  goldenDirOf: (projectRoot: string) => string;
  readCases: (casesDir: string) => GoldenCase[];
  checkGoldenSet: (
    cases: GoldenCase[],
    options: { minPairs: number; requiredKinds: string[] }
  ) => GoldenSetCheck;
}

interface CheckRegistry {
  coreRegistry: { reasonCodes: () => Set<string> };
}

interface SpecItem {
  id: string;
  type: string | null;
}

interface IssueLint {
  lint: (
    markdown: string,
    contract: object
  ) => { format: string; problems: string[]; items: SpecItem[] };
}

interface IssueContract {
  buildContract: (overlayFile: string) => object;
}

interface AffectsScope {
  computeScope: (
    issueMarkdown: string,
    filesTxt: string
  ) => { out_of_scope: string[] };
}

interface CiVerdict {
  parseCiFailures: (raw: string, requiredChecks: string[]) => string[] | null;
}

const requirePackage = createRequire(import.meta.url);
const requireFactory = <T>(file: string) =>
  requirePackage(path.join(FACTORY_DIR, file)) as T;

const { goldenDirOf, readCases, checkGoldenSet } = requireFactory<VerifierEval>(
  'verifier/eval/verifier-eval.js'
);
const { parseCiFailures } = requireFactory<CiVerdict>('verifier/verdict/ci.js');
const { coreRegistry } = requireFactory<CheckRegistry>(
  'verifier/checks/index.js'
);
const { lint } = requireFactory<IssueLint>('verifier/issue-lint.js');
const { buildContract } = requireFactory<IssueContract>(
  'verifier/issue-contract.js'
);
const { computeScope } = requireFactory<AffectsScope>(
  'verifier/affects-scope.js'
);

const REQUIRED_CHECKS = JSON.parse(
  fs.readFileSync(path.join(VERIFIER_DIR, 'required-checks.json'), 'utf8')
) as string[];
const CONTRACT = buildContract(OVERLAY_FILE);
const GOLDEN_DIR = goldenDirOf(PROJECT_ROOT);
const COVERAGE = { minPairs: 1, requiredKinds: [MODEL_KIND, SCOPE_KIND] };

const readText = (file: string) =>
  fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;

const parseJson = (text: string | null) => {
  if (text === null) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isNonEmptyString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '';

const caseDirectories = (goldenDir: string) =>
  fs
    .readdirSync(goldenDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

const patchedPaths = (patch: string) =>
  [...patch.matchAll(PATCH_FILE_HEADER)].flatMap((match) => [
    match[1],
    match[2],
  ]);

// Per-case data of Cards that the engine does not check itself: the source
// PR, real SHAs, the frozen inputs and, for a FAIL, an issue item the model
// judges (a ci/absence item would be computed, not criterion_failed).
const caseProblems = (goldenDir: string, name: string) => {
  const dir = path.join(goldenDir, name);
  const parsed = parseJson(readText(path.join(dir, 'case.json')));
  if (parsed === null) return [`${name}: case.json is not valid JSON`];
  const problems: string[] = [];
  if (parsed.pr !== SOURCE_PR) problems.push(`${name}: pr is not ${SOURCE_PR}`);
  for (const field of ['base_sha', 'head_sha']) {
    const sha = parsed[field];
    if (typeof sha !== 'string' || !SHA_PATTERN.test(sha)) {
      problems.push(`${name}: ${field} is not a 40 hex sha`);
    }
  }
  if (!isNonEmptyString(parsed.reason)) problems.push(`${name}: empty reason`);
  if (parsed.expected === 'PASS') {
    for (const field of ['expected_criterion_id', 'expected_reason_code']) {
      if (parsed[field] !== null) problems.push(`${name}: ${field} not null`);
    }
  }
  if (fs.existsSync(path.join(dir, 'approval.json'))) {
    problems.push(`${name}: approval.json must be absent`);
  }
  const issue = readText(path.join(dir, 'issue.md'));
  const ciText = readText(path.join(dir, 'ci.json'));
  const ci = parseJson(ciText);
  // The package's own CI verdict: workflow conclusion, every required check
  // completed/success exactly once, and no other failed check or status.
  const ciFailures =
    ciText === null ? null : parseCiFailures(ciText, REQUIRED_CHECKS);
  const exceptions = parseJson(readText(path.join(dir, 'exceptions.json')));
  if (!issue?.startsWith('# ')) {
    problems.push(`${name}: issue.md is missing or has no title`);
  }
  if (ci === null || ciFailures === null) {
    problems.push(`${name}: ci.json is missing or invalid`);
  }
  if (exceptions === null || Array.isArray(exceptions)) {
    problems.push(`${name}: exceptions.json is missing or invalid`);
  }
  if (ci !== null) {
    if (ci.head_sha !== parsed.head_sha) {
      problems.push(`${name}: ci.head_sha differs from head_sha`);
    }
  }
  for (const failure of ciFailures ?? []) problems.push(`${name}: ${failure}`);
  const id = parsed.expected_criterion_id;
  if (issue !== null && typeof id === 'string') {
    const spec = lint(issue, CONTRACT);
    const item = spec.items.find((entry) => entry.id === id);
    const isModelItem =
      item !== undefined && !COMPUTED_TYPES.includes(item.type ?? '');
    if (spec.format !== 'v2' || !isModelItem) {
      problems.push(`${name}: ${id} is not a model-judged issue item`);
    }
  }
  return problems;
};

// A mutation shares every replay input with its PASS case and differs only by
// case.json and mutation.patch.
const pairProblems = (goldenDir: string, mutation: GoldenCase) => {
  const { name, pairOf } = mutation;
  if (pairOf === null) return [];
  const passDir = path.join(goldenDir, pairOf);
  const mutationDir = path.join(goldenDir, name);
  const passCase = parseJson(readText(path.join(passDir, 'case.json')));
  const mutationCase = parseJson(readText(path.join(mutationDir, 'case.json')));
  if (passCase?.expected !== 'PASS') {
    return [`${name}: pair_of ${pairOf} is not a PASS case`];
  }
  const problems: string[] = [];
  for (const field of ['pr', 'base_sha', 'head_sha']) {
    if (passCase[field] !== mutationCase?.[field]) {
      problems.push(`${name}: ${field} differs from ${pairOf}`);
    }
  }
  for (const input of SHARED_INPUTS) {
    const passInput = readText(path.join(passDir, input));
    if (passInput !== readText(path.join(mutationDir, input))) {
      problems.push(`${name}: ${input} differs from ${pairOf}`);
    }
  }
  return problems;
};

const validateGoldenSet = (goldenDir: string) => {
  const directories = caseDirectories(goldenDir);
  const cases = readCases(goldenDir);
  const problems: string[] = [];
  if (directories.length === 0) problems.push('no case directories');
  const readNames = new Set(cases.map((item) => item.name));
  for (const name of directories) {
    if (!readNames.has(name)) problems.push(`${name}: not read by readCases`);
  }
  for (const item of cases) {
    if (!item.isValid) problems.push(`${item.name}: invalid for readCases`);
    problems.push(...caseProblems(goldenDir, item.name));
    problems.push(...pairProblems(goldenDir, item));
  }
  const coverage = checkGoldenSet(cases, COVERAGE);
  if (coverage.missingPairs > 0) problems.push('missing PASS/mutation pair');
  for (const kind of coverage.missingKinds) {
    problems.push(`missing mutation kind ${kind}`);
  }
  for (const name of coverage.unpairedPass) {
    problems.push(`${name}: PASS without mutation`);
  }
  return { cases, problems };
};

const tmpDirs: string[] = [];

const copyGoldenSet = () => {
  const dir = fs.mkdtempSync(TMP_PREFIX);
  tmpDirs.push(dir);
  fs.cpSync(GOLDEN_DIR, dir, { recursive: true });
  return dir;
};

const editCase = (
  dir: string,
  name: string,
  edit: (data: Record<string, unknown>) => void
) => {
  const file = path.join(dir, name, 'case.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<
    string,
    unknown
  >;
  edit(data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

const rejectionOf = (corrupt: (dir: string) => void) => {
  const dir = copyGoldenSet();
  expect(validateGoldenSet(dir).problems).toEqual([]);
  corrupt(dir);
  return validateGoldenSet(dir).problems;
};

describe('cards golden set', () => {
  afterEach(() => {
    for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
    tmpDirs.length = 0;
  });

  it('cards golden set has at least three valid cases', () => {
    const { cases, problems } = validateGoldenSet(GOLDEN_DIR);
    expect(problems).toEqual([]);
    expect(caseDirectories(GOLDEN_DIR)).toEqual([
      PASS_CASE,
      MODEL_FAIL_CASE,
      SCOPE_FAIL_CASE,
    ]);
    expect(cases.map((item) => item.name)).toEqual([
      PASS_CASE,
      MODEL_FAIL_CASE,
      SCOPE_FAIL_CASE,
    ]);
    expect(cases.every((item) => item.isValid)).toBe(true);
    const pass = cases.find((item) => item.name === PASS_CASE);
    expect(pass).toMatchObject({
      expected: 'PASS',
      pairOf: null,
      criterionId: null,
      reasonCode: null,
    });
    expect(REQUIRED_CHECKS).toHaveLength(5);
  });

  it('cards golden set has a fail case with reason', () => {
    const cases = readCases(GOLDEN_DIR);
    const codes = coreRegistry.reasonCodes();
    const modelFail = cases.find((item) => item.name === MODEL_FAIL_CASE);
    const scopeFail = cases.find((item) => item.name === SCOPE_FAIL_CASE);
    expect(modelFail).toMatchObject({
      expected: 'FAIL',
      pairOf: PASS_CASE,
      mutationKind: MODEL_KIND,
      reasonCode: CRITERION_FAILED,
      criterionId: 'AC-4',
    });
    expect(scopeFail).toMatchObject({
      expected: 'FAIL',
      pairOf: PASS_CASE,
      mutationKind: SCOPE_KIND,
      reasonCode: OUT_OF_SCOPE_FILE,
      criterionId: null,
    });
    expect(codes.has(CRITERION_FAILED)).toBe(true);
    expect(codes.has(OUT_OF_SCOPE_FILE)).toBe(true);
    expect(checkGoldenSet(cases, COVERAGE)).toEqual({
      unpairedPass: [],
      missingPairs: 0,
      missingKinds: [],
    });

    const issue = fs.readFileSync(
      path.join(GOLDEN_DIR, PASS_CASE, 'issue.md'),
      'utf8'
    );
    // Only the paths a patch touches: the full base -> mutated tree file list
    // needs the historical git objects and is checked with golden-mutation in
    // the README, not here (no git in unit tests).
    const scopeOf = (name: string) => {
      const patch = fs.readFileSync(
        path.join(GOLDEN_DIR, name, 'mutation.patch'),
        'utf8'
      );
      expect(patch.trim()).not.toBe('');
      const files = patchedPaths(patch).map((file) => `M\t${file}`);
      expect(files).not.toHaveLength(0);
      return computeScope(issue, files.join('\n')).out_of_scope;
    };
    expect(scopeOf(MODEL_FAIL_CASE)).toEqual([]);
    expect(scopeOf(SCOPE_FAIL_CASE)).toEqual(['docs/codeql.md']);
  });

  it('cards golden set rejects broken inputs', () => {
    expect(
      rejectionOf((dir) => {
        fs.writeFileSync(path.join(dir, MODEL_FAIL_CASE, 'case.json'), '{');
      })
    ).toContain(`${MODEL_FAIL_CASE}: not read by readCases`);

    expect(
      rejectionOf((dir) => {
        fs.rmSync(path.join(dir, SCOPE_FAIL_CASE, 'ci.json'));
      })
    ).toContain(`${SCOPE_FAIL_CASE}: ci.json is missing or invalid`);

    expect(
      rejectionOf((dir) => {
        const file = path.join(dir, PASS_CASE, 'ci.json');
        const ci = JSON.parse(fs.readFileSync(file, 'utf8')) as {
          checks: { name: string; conclusion: string }[];
        };
        const codeql = ci.checks.find((check) => check.name === 'CodeQL');
        if (codeql !== undefined) codeql.conclusion = 'failure';
        fs.writeFileSync(file, JSON.stringify(ci, null, 2));
      })
    ).toContain(`${PASS_CASE}: ci check failed: CodeQL (failure)`);

    expect(
      rejectionOf((dir) => {
        editCase(dir, PASS_CASE, (data) => {
          data.head_sha = '4e97212';
        });
      })
    ).toContain(`${PASS_CASE}: head_sha is not a 40 hex sha`);

    const missingNull = rejectionOf((dir) => {
      editCase(dir, PASS_CASE, (data) => {
        data.expected_reason_code = undefined;
      });
    });
    expect(missingNull).toContain(`${PASS_CASE}: invalid for readCases`);
    expect(missingNull).toContain(
      `${PASS_CASE}: expected_reason_code not null`
    );

    expect(
      rejectionOf((dir) => {
        editCase(dir, SCOPE_FAIL_CASE, (data) => {
          data.expected_reason_code = 'scope_violation';
        });
      })
    ).toContain(`${SCOPE_FAIL_CASE}: invalid for readCases`);

    expect(
      rejectionOf((dir) => {
        editCase(dir, MODEL_FAIL_CASE, (data) => {
          data.pair_of = '81';
        });
      })
    ).toContain(`${MODEL_FAIL_CASE}: pair_of 81 is not a PASS case`);

    expect(
      rejectionOf((dir) => {
        editCase(dir, MODEL_FAIL_CASE, (data) => {
          data.expected_criterion_id = 'DOD-1';
        });
      })
    ).toContain(`${MODEL_FAIL_CASE}: DOD-1 is not a model-judged issue item`);

    expect(
      rejectionOf((dir) => {
        fs.appendFileSync(path.join(dir, SCOPE_FAIL_CASE, 'issue.md'), '\n');
      })
    ).toContain(`${SCOPE_FAIL_CASE}: issue.md differs from ${PASS_CASE}`);
  });

  it('cards golden set rejects missing coverage', () => {
    expect(
      rejectionOf((dir) => {
        for (const name of caseDirectories(dir)) {
          fs.rmSync(path.join(dir, name), { recursive: true });
        }
      })
    ).toEqual(
      expect.arrayContaining([
        'no case directories',
        'missing PASS/mutation pair',
      ])
    );

    const withoutPass = rejectionOf((dir) => {
      fs.rmSync(path.join(dir, PASS_CASE), { recursive: true });
    });
    expect(withoutPass).toContain('missing PASS/mutation pair');
    expect(withoutPass).toContain(
      `${MODEL_FAIL_CASE}: pair_of ${PASS_CASE} is not a PASS case`
    );

    expect(
      rejectionOf((dir) => {
        fs.rmSync(path.join(dir, MODEL_FAIL_CASE), { recursive: true });
      })
    ).toContain(`missing mutation kind ${MODEL_KIND}`);

    expect(
      rejectionOf((dir) => {
        fs.rmSync(path.join(dir, SCOPE_FAIL_CASE), { recursive: true });
      })
    ).toContain(`missing mutation kind ${SCOPE_KIND}`);
  });
});

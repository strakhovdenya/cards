import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

// Structural check of the PRD and plan templates of the installed
// dark-factory package together with the Cards overlays
// (.factory/overlays/{prd,plan}.json). The real templates.js runs as a child
// process, exactly as the prd and plan skills tell the model to run it. No
// model, network, Supabase or git.

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');
const FACTORY_DIR = path.join(PROJECT_ROOT, 'node_modules/dark-factory');
const TEMPLATES_JS = path.join(FACTORY_DIR, 'skills/templates.js');
const OVERLAYS_DIR = path.join(PROJECT_ROOT, '.factory/overlays');
const PROFILE_FILE = path.join(PROJECT_ROOT, '.factory/profile.json');
const TMP_PREFIX = path.join(os.tmpdir(), 'cards-template-overlays-');

const MAX_OUTPUT_CHARS = 20000;
const TAIL_CUT_CHARS = 20;
const CONFLICTING_TITLE = 'Goal';

const require = createRequire(import.meta.url);

interface BaseSection {
  title: string;
}

interface OverlaySection {
  title: string;
  body: string;
}

interface TemplateRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

type Kind = 'prd' | 'plan';

interface TemplateSpec {
  baseTitles: string[];
  overlay: OverlaySection[];
  anchors: Record<string, string[]>;
}

const { PRD_SECTIONS, PLAN_SECTIONS } = require(TEMPLATES_JS) as {
  PRD_SECTIONS: BaseSection[];
  PLAN_SECTIONS: BaseSection[];
};

const BASE_TITLES: Record<Kind, string[]> = {
  prd: PRD_SECTIONS.map(({ title }) => title),
  plan: PLAN_SECTIONS.map(({ title }) => title),
};

const ANCHORS: Record<Kind, Record<string, string[]>> = {
  prd: {
    'Инварианты Cards': ['read-only', 'RLS', 'src/services'],
    'Влияние на данные и схему Supabase': [
      'docs/',
      'аддитив',
      'ломающ',
      'Не применимо: схема не меняется.',
    ],
    'Влияние на UI': ['мобиль', 'bottom navigation'],
  },
  plan: {
    'Правила декомпозиции Cards': [
      'первой задачей',
      'BLOCKED-DB-CHANGE',
      'отдельной фазой',
      'остаётся рабочим',
    ],
  },
};

const readOverlay = (kind: Kind): OverlaySection[] => {
  const file = path.join(OVERLAYS_DIR, `${kind}.json`);
  const { sections } = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    sections: OverlaySection[];
  };
  return sections;
};

const runTemplates = (kind: Kind, projectRoot = PROJECT_ROOT): TemplateRun => {
  const { status, stdout, stderr } = spawnSync(
    process.execPath,
    [TEMPLATES_JS, kind, '--project', projectRoot],
    { encoding: 'utf8' }
  );
  return { status, stdout, stderr };
};

const specFor = (kind: Kind): TemplateSpec => ({
  baseTitles: BASE_TITLES[kind],
  overlay: readOverlay(kind),
  anchors: ANCHORS[kind],
});

const headingOf = (title: string) => `## ${title}`;

const headingLines = (lines: string[], title: string) =>
  lines.flatMap((line, index) => (line === headingOf(title) ? [index] : []));

const sectionBody = (lines: string[], title: string) => {
  const [start] = headingLines(lines, title);
  if (start === undefined) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

// Shared by the AC-2, AC-3 and AC-9 tests: returns the list of problems found
// in a template output, an empty list means the output is complete.
const checkTemplate = (output: string, spec: TemplateSpec): string[] => {
  const problems: string[] = [];
  const lines = output.split(/\r?\n/);
  let lastBaseLine = -1;
  for (const title of spec.baseTitles) {
    const [line] = headingLines(lines, title);
    if (line === undefined) problems.push(`missing base section "${title}"`);
    else if (line < lastBaseLine) problems.push(`base "${title}" out of order`);
    else lastBaseLine = line;
  }
  let lastOverlayLine = lastBaseLine;
  for (const { title } of spec.overlay) {
    const found = headingLines(lines, title);
    if (found.length !== 1) {
      problems.push(`overlay section "${title}" found ${found.length} times`);
    } else if (found[0] < lastOverlayLine) {
      problems.push(`overlay section "${title}" out of order`);
    } else {
      lastOverlayLine = found[0];
    }
  }
  for (const [title, anchors] of Object.entries(spec.anchors)) {
    const body = sectionBody(lines, title);
    if (body === null) {
      problems.push(`missing required section "${title}"`);
      continue;
    }
    for (const anchor of anchors) {
      if (!body.includes(anchor)) {
        problems.push(`missing anchor "${anchor}" in "${title}"`);
      }
    }
  }
  const lastSection = spec.overlay.at(-1);
  if (!lastSection || !output.trimEnd().endsWith(lastSection.body.trimEnd())) {
    problems.push('output does not end with the last overlay section');
  }
  if (output.length > MAX_OUTPUT_CHARS) {
    problems.push(
      `output is ${output.length} chars, limit ${MAX_OUTPUT_CHARS}`
    );
  }
  return problems;
};

const skillCallLine = (kind: Kind) =>
  `node "<root>/node_modules/dark-factory/skills/templates.js" ${kind} ` +
  '--project "<root>"';

const checkSkillCall = (skillText: string, kind: Kind) =>
  skillText.split(/\r?\n/).some((line) => line.trim() === skillCallLine(kind));

const readSkill = (kind: Kind) =>
  fs.readFileSync(path.join(FACTORY_DIR, 'skills', kind, 'SKILL.md'), 'utf8');

const tempRoots: string[] = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(TMP_PREFIX);
  tempRoots.push(root);
  return root;
};

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('template overlays of Cards', () => {
  it('prd template carries Cards sections after the base', () => {
    const run = runTemplates('prd');
    expect(run.status).toBe(0);
    expect(checkTemplate(run.stdout, specFor('prd'))).toEqual([]);
  });

  it('plan template carries Cards decomposition rules after the base', () => {
    const run = runTemplates('plan');
    expect(run.status).toBe(0);
    expect(checkTemplate(run.stdout, specFor('plan'))).toEqual([]);
  });

  it('overlay sections do not leak between prd and plan', () => {
    const prdRun = runTemplates('prd');
    const planRun = runTemplates('plan');
    expect(prdRun.status).toBe(0);
    expect(planRun.status).toBe(0);
    const prdLines = prdRun.stdout.split(/\r?\n/);
    const planLines = planRun.stdout.split(/\r?\n/);
    const prdTitles = readOverlay('prd').map(({ title }) => title);
    const planTitles = readOverlay('plan').map(({ title }) => title);
    expect(prdTitles.length).toBeGreaterThan(0);
    expect(planTitles.length).toBeGreaterThan(0);
    for (const title of planTitles) {
      expect(planLines).toContain(headingOf(title));
      expect(prdLines).not.toContain(headingOf(title));
    }
    for (const title of prdTitles) {
      expect(prdLines).toContain(headingOf(title));
      expect(planLines).not.toContain(headingOf(title));
    }
  });

  it('template output is complete and within tool output limit', () => {
    for (const kind of ['prd', 'plan'] as const) {
      const run = runTemplates(kind);
      expect(run.status).toBe(0);
      expect(run.stdout.length).toBeLessThanOrEqual(MAX_OUTPUT_CHARS);
      expect(checkTemplate(run.stdout, specFor(kind))).toEqual([]);
    }
  });

  it('package skills instruct to run templates.js for their kind', () => {
    for (const kind of ['prd', 'plan'] as const) {
      expect(checkSkillCall(readSkill(kind), kind)).toBe(true);
    }
  });

  it('overlay title equal to a base section is rejected', () => {
    const root = createTempRoot();
    const factoryDir = path.join(root, '.factory');
    fs.cpSync(OVERLAYS_DIR, path.join(factoryDir, 'overlays'), {
      recursive: true,
    });
    fs.copyFileSync(PROFILE_FILE, path.join(factoryDir, 'profile.json'));
    const conflicting = { sections: [{ title: CONFLICTING_TITLE, body: 'x' }] };
    fs.writeFileSync(
      path.join(factoryDir, 'overlays/prd.json'),
      JSON.stringify(conflicting)
    );
    const run = runTemplates('prd', root);
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain(CONFLICTING_TITLE);
  });

  it('prd overlay sections come after the base sections', () => {
    const run = runTemplates('prd');
    expect(run.status).toBe(0);
    const lines = run.stdout.split(/\r?\n/);
    const titles = readOverlay('prd').map(({ title }) => title);
    expect(titles.length).toBeGreaterThan(0);
    const lastBase = Math.max(
      ...BASE_TITLES.prd.map((title) => headingLines(lines, title)[0])
    );
    for (const title of titles) {
      const found = headingLines(lines, title);
      expect(found).toHaveLength(1);
      expect(found[0]).toBeGreaterThan(lastBase);
    }
  });

  describe('checker', () => {
    const prdOutput = () => runTemplates('prd').stdout;

    it('reports a missing required section', () => {
      const broken = prdOutput().replace(
        headingOf('Инварианты Cards'),
        '### Инварианты Cards'
      );
      const problems = checkTemplate(broken, specFor('prd'));
      expect(problems).toContain('missing required section "Инварианты Cards"');
    });

    it('reports a missing anchor', () => {
      const broken = prdOutput().replaceAll('read-only', '');
      const problems = checkTemplate(broken, specFor('prd'));
      expect(problems).toContain(
        'missing anchor "read-only" in "Инварианты Cards"'
      );
    });

    it('reports a truncated tail', () => {
      const output = prdOutput();
      const broken = output.slice(0, output.trimEnd().length - TAIL_CUT_CHARS);
      const problems = checkTemplate(broken, specFor('prd'));
      expect(problems).toContain(
        'output does not end with the last overlay section'
      );
    });
  });

  it('skill without templates.js call is rejected', () => {
    expect(checkSkillCall('# Skill\n\nNo command here.', 'prd')).toBe(false);
    const planOnly = `# Skill\n\n${skillCallLine('plan')}\n`;
    expect(checkSkillCall(planOnly, 'prd')).toBe(false);
    expect(checkSkillCall(planOnly, 'plan')).toBe(true);
  });
});

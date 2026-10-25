import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Ralph grants the agent a gate command as the exact text of its argv joined
// by spaces. Claude Code rejects brace expansion and does not match quoted or
// globbed forms against that text, so a gate argv must be free of such
// characters for the agent to be able to run the check at all.

const PROFILE_PATH = path.resolve(
  import.meta.dirname,
  '../../.factory/profile.json'
);
const FORBIDDEN_CHARACTERS = /[*{}?'"]/;

interface GateCommand {
  argv: string[];
}

interface Profile {
  apps: { gate: GateCommand[] }[];
}

const readGateCommands = (): GateCommand[] => {
  const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8')) as Profile;
  return profile.apps.flatMap((app) => app.gate);
};

const hasForbiddenCharacters = (argv: string[]) =>
  argv.some((argument) => FORBIDDEN_CHARACTERS.test(argument));

describe('gate argv in .factory/profile.json', () => {
  it('gate argv has no glob or quote characters', () => {
    const offending = readGateCommands().filter(({ argv }) =>
      hasForbiddenCharacters(argv)
    );

    expect(offending).toEqual([]);
  });

  it('checks formatting of the src directory', () => {
    const prettier = readGateCommands().find(({ argv }) =>
      argv.includes('node_modules/prettier/bin/prettier.cjs')
    );

    expect(prettier?.argv).toEqual([
      'node',
      'node_modules/prettier/bin/prettier.cjs',
      '--check',
      'src',
    ]);
  });

  it('flags a glob in a synthetic argv', () => {
    expect(hasForbiddenCharacters(['prettier', 'src/**/*.{ts,tsx}'])).toBe(
      true
    );
  });

  it('accepts a plain argv and flags a quote', () => {
    expect(hasForbiddenCharacters(['prettier', '--check', 'src'])).toBe(false);
    expect(hasForbiddenCharacters(['prettier', '"src"'])).toBe(true);
  });
});

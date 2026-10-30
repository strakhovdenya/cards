import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogContent, TextField } from '@mui/material';
import { VerbStudy } from './VerbStudy';
import type { Verb } from '@/types';

const { getVerbs, speak, isSupported } = vi.hoisted(() => ({
  getVerbs: vi.fn(),
  speak: vi.fn(),
  isSupported: vi.fn(() => true),
}));

vi.mock('@/services/verbService', () => ({ getVerbs }));
vi.mock('@/services/speechService', () => ({
  useSpeech: () => ({ speak, isSupported }),
}));

const TYPED_TEXT = 'adsf pp';

const makeVerb = (id: string, infinitive: string): Verb => ({
  id,
  infinitive,
  translation: `${infinitive}-ru`,
  conjugations: [],
  user_id: 'user-1',
  learned: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const verbs = [makeVerb('1', 'arbeiten'), makeVerb('2', 'lernen')];

const setup = async (extra: ReactElement | null = null) => {
  const user = userEvent.setup();
  render(
    <>
      <VerbStudy />
      {extra}
    </>
  );
  await screen.findByText('1 из 2');
  return { user };
};

const DialogWithInput = () => (
  <Dialog open>
    <DialogContent>
      <TextField
        label="Название"
        slotProps={{ htmlInput: { 'data-testid': 'dialog-input' } }}
      />
    </DialogContent>
  </Dialog>
);

describe('VerbStudy keyboard shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVerbs.mockResolvedValue(verbs);
    speak.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('typing in dialog does not trigger verb study shortcuts', async () => {
    const { user } = await setup(<DialogWithInput />);
    const input = await screen.findByTestId('dialog-input');

    await user.click(input);
    await user.keyboard(`${TYPED_TEXT}{Enter}`);

    expect(input).toHaveProperty('value', TYPED_TEXT);
    expect(screen.getByText('1 из 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Правильно' })).toBeNull();
    expect(speak).not.toHaveBeenCalled();
  });

  it('ctrl d does not navigate', async () => {
    const { user } = await setup();

    await user.keyboard('{Control>}d{/Control}');

    expect(screen.getByText('1 из 2')).toBeTruthy();
  });

  it('repeated enter does not mark answer', async () => {
    const { user } = await setup();
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Правильно' })).toBeTruthy();

    fireEvent.keyDown(document.body, { key: 'Enter', repeat: true });

    expect(screen.getByText('Всего: 0')).toBeTruthy();
  });

  it('shortcuts still work on body', async () => {
    const { user } = await setup();

    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Правильно' })).toBeTruthy();

    await user.keyboard('d');
    expect(screen.getByText('2 из 2')).toBeTruthy();
  });
});

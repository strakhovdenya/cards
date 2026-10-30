import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogContent, TextField } from '@mui/material';
import { VerbViewer } from './VerbViewer';
import type { Verb } from '@/types';

vi.mock('./SpeechButton', () => ({ SpeechButton: () => null }));

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

const setup = (extra: ReactElement | null = null) => {
  const user = userEvent.setup();
  render(
    <>
      <VerbViewer verbs={verbs} />
      {extra}
    </>
  );
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

describe('VerbViewer keyboard shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('button keys run button action only', async () => {
    const { user } = setup();
    await screen.findByText('1 из 2');

    screen.getByRole('button', { name: /Назад/ }).focus();
    await user.keyboard(' ');

    expect(screen.getByText('2 из 2')).toBeTruthy();
  });

  it('dialog keys do not navigate verbs', async () => {
    const { user } = setup(<DialogWithInput />);
    const input = await screen.findByTestId('dialog-input');

    await user.click(input);
    await user.keyboard('{ArrowRight}{ArrowLeft}{ArrowRight} ');

    expect(screen.getByText('1 из 2')).toBeTruthy();
  });

  it('alt arrow does not navigate verbs', async () => {
    const { user } = setup();
    await screen.findByText('1 из 2');

    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');

    expect(screen.getByText('1 из 2')).toBeTruthy();
  });

  it('shortcuts still work on body', async () => {
    const { user } = setup();
    await screen.findByText('1 из 2');

    await user.keyboard('{ArrowRight}');

    expect(screen.getByText('2 из 2')).toBeTruthy();
  });
});

import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogContent, TextField } from '@mui/material';
import { UniversalCardViewer } from './UniversalCardViewer';
import { BasicCardStrategy } from '@/strategies/BasicCardStrategy';
import type { Card } from '@/types';

vi.mock('@/services/tagService', () => ({
  ClientTagService: { getTags: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/services/cardService', () => ({
  ClientCardService: { toggleLearnedStatus: vi.fn() },
}));
vi.mock('./SpeechButton', () => ({ SpeechButton: () => null }));

const HINT_UNFLIPPED = /Нажмите для показа/;
const HINT_FLIPPED = /Нажмите для возврата/;
const TYPED_TEXT = 'das Haus ist fast';

const makeCard = (id: string, germanWord: string): Card => ({
  id,
  germanWord,
  translation: `${germanWord}-ru`,
  user_id: 'user-1',
  tags: [],
  learned: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const cards = [makeCard('1', 'Haus'), makeCard('2', 'Baum')];
const strategy = new BasicCardStrategy();

const setup = (extra: ReactElement | null = null, isGuest = false) => {
  const toggleLearnedService = vi
    .fn()
    .mockResolvedValue({ status: 'success', data: null });
  const onCardUpdate = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <UniversalCardViewer
        cards={cards}
        strategy={strategy}
        onCardUpdate={onCardUpdate}
        toggleLearnedService={toggleLearnedService}
        isGuest={isGuest}
      />
      {extra}
    </>
  );
  return { user, toggleLearnedService, onCardUpdate };
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

describe('UniversalCardViewer keyboard shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('typing in dialog input does not trigger shortcuts', async () => {
    const { user, toggleLearnedService, onCardUpdate } = setup(
      <DialogWithInput />
    );
    const input = await screen.findByTestId('dialog-input');

    await user.click(input);
    await user.keyboard(TYPED_TEXT);

    expect(input).toHaveProperty('value', TYPED_TEXT);
    expect(screen.getByText('1 из 2')).toBeTruthy();
    expect(screen.getByText(HINT_UNFLIPPED)).toBeTruthy();
    expect(onCardUpdate).not.toHaveBeenCalled();
    expect(toggleLearnedService).not.toHaveBeenCalled();
  });

  it('enter in dialog does not toggle learned', async () => {
    const { user, toggleLearnedService, onCardUpdate } = setup(
      <DialogWithInput />
    );
    const input = await screen.findByTestId('dialog-input');

    await user.click(input);
    await user.keyboard('{Enter}');

    expect(onCardUpdate).not.toHaveBeenCalled();
    expect(toggleLearnedService).not.toHaveBeenCalled();
  });

  it('enter on button runs button action only', async () => {
    const { user, toggleLearnedService, onCardUpdate } = setup();
    await user.click(screen.getByRole('button', { name: /Перевернуть/ }));
    expect(screen.getByText(HINT_FLIPPED)).toBeTruthy();

    screen.getByRole('button', { name: /Перемешать/ }).focus();
    await user.keyboard('{Enter}');

    expect(screen.getByText(HINT_UNFLIPPED)).toBeTruthy();
    expect(onCardUpdate).not.toHaveBeenCalled();
    expect(toggleLearnedService).not.toHaveBeenCalled();
  });

  it('enter on body still toggles learned', async () => {
    const { user, toggleLearnedService, onCardUpdate } = setup();
    await screen.findByText('1 из 2');

    await user.keyboard('{Enter}');

    expect(onCardUpdate).toHaveBeenCalledTimes(1);
    expect(toggleLearnedService).toHaveBeenCalledWith('1', true);
  });

  it('ignores contenteditable and select targets', async () => {
    const { user, toggleLearnedService } = setup(
      <>
        <div data-testid="editable" contentEditable tabIndex={0} />
        <select data-testid="picker" defaultValue="a">
          <option value="a">a</option>
        </select>
      </>
    );
    await screen.findByText('1 из 2');

    for (const testId of ['editable', 'picker']) {
      screen.getByTestId(testId).focus();
      await user.keyboard('adsf ');
      expect(screen.getByText('1 из 2')).toBeTruthy();
      expect(screen.getByText(HINT_UNFLIPPED)).toBeTruthy();
    }
    expect(toggleLearnedService).not.toHaveBeenCalled();
  });

  it('space on button does not flip card', async () => {
    const { user } = setup();
    await screen.findByText('1 из 2');

    screen.getByRole('button', { name: /горячие клавиши/i }).focus();
    await user.keyboard(' ');

    expect(screen.getByText(HINT_UNFLIPPED)).toBeTruthy();
  });

  it('guest cannot toggle learned', async () => {
    const { user, toggleLearnedService, onCardUpdate } = setup(null, true);
    await screen.findByText('1 из 2');

    await user.keyboard('{Enter}');

    expect(onCardUpdate).not.toHaveBeenCalled();
    expect(toggleLearnedService).not.toHaveBeenCalled();
  });
});

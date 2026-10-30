import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpeechButton } from './SpeechButton';

const { speak, isSupported } = vi.hoisted(() => ({
  speak: vi.fn(),
  isSupported: vi.fn(() => true),
}));

vi.mock('@/services/speechService', () => ({
  useSpeech: () => ({ speak, isSupported }),
}));

const setup = () => {
  const user = userEvent.setup();
  render(
    <>
      <input data-testid="field" />
      <SpeechButton text="Haus" enableHotkey />
    </>
  );
  return { user };
};

describe('SpeechButton keyboard shortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    speak.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('space in input does not speak', async () => {
    const { user } = setup();

    await user.click(screen.getByTestId('field'));
    await user.keyboard('p p');

    expect(screen.getByTestId('field')).toHaveProperty('value', 'p p');
    expect(speak).not.toHaveBeenCalled();
  });

  it('ctrl p does not speak', async () => {
    const { user } = setup();

    await user.keyboard('{Control>}p{/Control}');

    expect(speak).not.toHaveBeenCalled();
  });

  it('shortcut on body still speaks', async () => {
    const { user } = setup();

    await user.keyboard('p');

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith('Haus', expect.any(Object));
  });
});

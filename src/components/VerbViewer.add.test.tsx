import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerbViewer } from './VerbViewer';
import type { Verb } from '@/types';

vi.mock('./VerbCard', () => ({
  VerbCard: ({ verb }: { verb: Verb }) => <div>{verb.infinitive}</div>,
}));

const ADD_BUTTON_NAME = 'Добавить глагол';

const createVerb = (infinitive: string): Verb => ({
  id: infinitive,
  infinitive,
  translation: 'работать',
  conjugations: [],
  user_id: 'user-1',
  learned: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe('VerbViewer add verb', () => {
  afterEach(() => {
    cleanup();
  });

  it('add verb button navigates to verb editor', async () => {
    const onAddVerb = vi.fn();
    render(<VerbViewer verbs={[]} onAddVerb={onAddVerb} />);

    await userEvent.click(
      screen.getByRole('button', { name: ADD_BUTTON_NAME })
    );

    expect(onAddVerb).toHaveBeenCalledTimes(1);
  });

  it('no add button without handler', () => {
    render(<VerbViewer verbs={[]} />);

    expect(screen.getByText('Нет глаголов')).toBeTruthy();
    expect(screen.queryByRole('button', { name: ADD_BUTTON_NAME })).toBeNull();
  });

  it('non-empty list shows verbs not empty state', () => {
    render(<VerbViewer verbs={[createVerb('arbeiten')]} onAddVerb={vi.fn()} />);

    expect(screen.getByText('arbeiten')).toBeTruthy();
    expect(screen.queryByText('Нет глаголов')).toBeNull();
    expect(screen.queryByRole('button', { name: ADD_BUTTON_NAME })).toBeNull();
  });
});

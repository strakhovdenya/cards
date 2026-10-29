'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '@/types';

// Отметки «Выучено» гостя живут только в этом браузере и не уходят на сервер
export const DEMO_PROGRESS_KEY = 'cards:demo-progress:v1';

type Progress = ReadonlyMap<string, boolean>;

const EMPTY_PROGRESS: Progress = new Map();

// Чужая или повреждённая запись не ломает демо: берутся только пары id → boolean
const parseProgress = (raw: string | null): Progress => {
  if (!raw) return EMPTY_PROGRESS;
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return EMPTY_PROGRESS;
  }
  const progress = new Map<string, boolean>();
  for (const [id, learned] of Object.entries(value)) {
    if (typeof learned === 'boolean') progress.set(id, learned);
  }
  return progress;
};

const readProgress = (): Progress => {
  try {
    return parseProgress(window.localStorage.getItem(DEMO_PROGRESS_KEY));
  } catch (error) {
    console.error('Error reading demo progress:', error);
    return EMPTY_PROGRESS;
  }
};

// Недоступное хранилище оставляет отметки в памяти до размонтирования
const writeProgress = (progress: Progress) => {
  try {
    const serialized = JSON.stringify(Object.fromEntries(progress));
    window.localStorage.setItem(DEMO_PROGRESS_KEY, serialized);
  } catch (error) {
    console.error('Error saving demo progress:', error);
  }
};

export function useDemoProgress(cards: Card[]) {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const progressRef = useRef(progress);

  // Чтение после монтирования: на сервере localStorage нет, а разметка
  // первого рендера должна совпасть с серверной
  useEffect(() => {
    const stored = readProgress();
    progressRef.current = stored;
    setProgress(stored);
  }, []);

  const toggleLearned = useCallback((id: string, learned: boolean) => {
    const next = new Map(progressRef.current);
    next.set(id, learned);
    progressRef.current = next;
    setProgress(next);
    writeProgress(next);
  }, []);

  const progressCards = useMemo(
    () =>
      cards.map((card) => {
        const learned = progress.get(card.id);
        return learned === undefined ? card : { ...card, learned };
      }),
    [cards, progress]
  );

  return { cards: progressCards, toggleLearned };
}

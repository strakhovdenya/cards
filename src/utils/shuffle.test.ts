import { describe, it, expect } from 'vitest';
import { shuffle } from '@/utils/shuffle';

describe('shuffle', () => {
  it('returns permutation without mutating input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const snapshot = [...input];

    const result = shuffle(input);

    expect(result).not.toBe(input);
    expect(input).toEqual(snapshot);
    expect([...result].sort((a, b) => a - b)).toEqual(snapshot);
  });

  it('is deterministic with injected random', () => {
    const input = [1, 2, 3, 4];
    const createRandom = () => {
      const values = [0, 0, 0];
      let index = 0;
      return () => values[index++];
    };

    const first = shuffle(input, createRandom());
    const second = shuffle(input, createRandom());

    expect(first).toEqual([2, 3, 4, 1]);
    expect(second).toEqual(first);
    expect(first).not.toEqual(input);
  });

  it('reaches every permutation once across all random choices', () => {
    const input = ['a', 'b', 'c'];
    const permutations = new Set<string>();

    for (let first = 0; first < 3; first++) {
      for (let second = 0; second < 2; second++) {
        const values = [(first + 0.5) / 3, (second + 0.5) / 2];
        let index = 0;
        permutations.add(shuffle(input, () => values[index++]).join(''));
      }
    }

    expect(permutations.size).toBe(6);
  });

  it('handles empty and single element arrays', () => {
    const empty: number[] = [];
    const single = [7];

    const emptyResult = shuffle(empty);
    const singleResult = shuffle(single);

    expect(emptyResult).toEqual([]);
    expect(emptyResult).not.toBe(empty);
    expect(singleResult).toEqual([7]);
    expect(singleResult).not.toBe(single);
  });

  it('preserves duplicate values count', () => {
    const input = ['a', 'b', 'a', 'c', 'a', 'b'];

    const result = shuffle(input);

    const count = (items: string[], value: string) =>
      items.filter((item) => item === value).length;
    for (const value of ['a', 'b', 'c']) {
      expect(count(result, value)).toBe(count(input, value));
    }
    expect(result).toHaveLength(input.length);
  });
});

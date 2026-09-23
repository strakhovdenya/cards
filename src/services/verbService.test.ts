import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ClientVerbService,
  getRandomPerson,
  getConjugationForPerson,
} from '@/services/verbService';
import type { Verb } from '@/types';

const mockVerb: Verb = {
  id: '1',
  infinitive: 'laufen',
  translation: 'бегать',
  conjugations: [
    { person: 'ich', form: 'laufe', translation: 'я бегу' },
    { person: 'du', form: 'läufst', translation: 'ты бежишь' },
    { person: 'er/sie/es', form: 'läuft', translation: 'он бежит' },
  ],
  user_id: 'user1',
  learned: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeFetchResponse(body: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClientVerbService.getVerbs', () => {
  it('returns verbs on success', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockVerb] }));
    const verbs = await ClientVerbService.getVerbs();
    expect(verbs).toEqual([mockVerb]);
  });

  it('throws when response.ok is false', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ error: 'Unauthorized' }, false)
    );
    await expect(ClientVerbService.getVerbs()).rejects.toThrow('Unauthorized');
  });

  it('throws default message when response.ok is false and no error field', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({}, false));
    await expect(ClientVerbService.getVerbs()).rejects.toThrow('Ошибка API');
  });

  it('throws when response.ok is true but data.error is set', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ error: 'Service error' }));
    await expect(ClientVerbService.getVerbs()).rejects.toThrow('Service error');
  });
});

describe('ClientVerbService.createVerb', () => {
  it('returns created verb on success', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: mockVerb }));
    const verb = await ClientVerbService.createVerb({
      infinitive: 'laufen',
      translation: 'бегать',
      conjugations: [],
    });
    expect(verb).toEqual(mockVerb);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/verbs',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ error: 'Validation failed' }, false)
    );
    await expect(
      ClientVerbService.createVerb({
        infinitive: 'laufen',
        translation: 'бегать',
        conjugations: [],
      })
    ).rejects.toThrow('Validation failed');
  });

  it('propagates the server error message verbatim', async () => {
    const message = 'Глагол с таким инфинитивом уже существует';
    mockFetch.mockResolvedValue(makeFetchResponse({ error: message }, false));
    await expect(
      ClientVerbService.createVerb({
        infinitive: 'laufen',
        translation: 'бегать',
        conjugations: [],
      })
    ).rejects.toThrow(new Error(message));
  });
});

describe('getRandomPerson', () => {
  const validPersons = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie / Sie'];

  it('returns one of the 6 valid persons', () => {
    for (let i = 0; i < 20; i++) {
      expect(validPersons).toContain(getRandomPerson());
    }
  });
});

describe('getConjugationForPerson', () => {
  it('returns conjugation for matching person', () => {
    const result = getConjugationForPerson(mockVerb, 'ich');
    expect(result).toEqual({
      person: 'ich',
      form: 'laufe',
      translation: 'я бегу',
    });
  });

  it('returns null for non-existent person', () => {
    expect(getConjugationForPerson(mockVerb, 'wir')).toBeNull();
  });

  it('returns null for empty conjugations list', () => {
    const emptyVerb: Verb = { ...mockVerb, conjugations: [] };
    expect(getConjugationForPerson(emptyVerb, 'ich')).toBeNull();
  });
});

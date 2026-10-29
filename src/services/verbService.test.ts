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
    ).rejects.toThrow(message);
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

describe('ClientVerbService mutation results', () => {
  const verbRequest = {
    infinitive: 'laufen',
    translation: 'бегать',
    conjugations: mockVerb.conjugations,
  };

  const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  it('create verb returns unknown on rejected fetch', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await ClientVerbService.createVerbWithResult(verbRequest);
    expect(result.status).toBe('unknown');
    expect(result).toMatchObject({ httpStatus: null });
  });

  it('create verb returns success', async () => {
    const sentVerb = { id: '1', ...verbRequest };
    mockFetch.mockResolvedValue(jsonResponse({ data: sentVerb }, 201));
    const result = await ClientVerbService.createVerbWithResult(verbRequest);
    expect(result).toEqual({ status: 'success', data: sentVerb });
  });

  it('update verb returns rejected with server message', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Verb not found' }, 404));
    const result = await ClientVerbService.updateVerbWithResult('1', {
      learned: true,
    });
    expect(result).toEqual({
      status: 'rejected',
      message: 'Verb not found',
      httpStatus: 404,
    });
  });

  it('delete verb returns unknown on gateway html', async () => {
    mockFetch.mockResolvedValue(new Response('<html></html>', { status: 502 }));
    const result = await ClientVerbService.deleteVerbWithResult('1');
    expect(result).toMatchObject({ status: 'unknown', httpStatus: 502 });
  });
});

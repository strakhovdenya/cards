import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClientNounService } from '@/services/nounService';
import type { Card } from '@/types';

const mockCard: Card = {
  id: '1',
  germanWord: 'der Mann',
  translation: 'мужчина',
  user_id: 'user1',
  tags: [],
  learned: false,
  word_type: 'noun',
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

describe('ClientNounService.getNouns', () => {
  it('returns nouns on success', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockCard] }));
    const nouns = await ClientNounService.getNouns();
    expect(nouns).toEqual([mockCard]);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/nouns',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('throws when response.ok is false', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ error: 'Forbidden' }, false)
    );
    await expect(ClientNounService.getNouns()).rejects.toThrow('Forbidden');
  });

  it('throws default message when no error field and response.ok is false', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({}, false));
    await expect(ClientNounService.getNouns()).rejects.toThrow('Ошибка API');
  });

  it('throws when response.ok is true but data.error is set', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ error: 'Service unavailable' })
    );
    await expect(ClientNounService.getNouns()).rejects.toThrow(
      'Service unavailable'
    );
  });

  it('appends guest param when guest option is set', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }));
    await ClientNounService.getNouns({ guest: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('guest=1'),
      expect.anything()
    );
  });
});

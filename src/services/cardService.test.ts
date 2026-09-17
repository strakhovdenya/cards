import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClientCardService } from '@/services/cardService';
import type { Card } from '@/types';

const mockCard: Card = {
  id: '1',
  germanWord: 'Hund',
  translation: 'собака',
  user_id: 'user1',
  tags: [],
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

describe('ClientCardService.getCards', () => {
  it('returns cards on success', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockCard] }));
    const cards = await ClientCardService.getCards();
    expect(cards).toEqual([mockCard]);
  });

  it('throws when response.ok is false', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ error: 'Unauthorized' }, false)
    );
    await expect(ClientCardService.getCards()).rejects.toThrow('Unauthorized');
  });

  it('throws default message when response.ok is false and no error field', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({}, false));
    await expect(ClientCardService.getCards()).rejects.toThrow('Ошибка API');
  });

  it('throws when response.ok is true but data.error is set', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ error: 'Something went wrong' })
    );
    await expect(ClientCardService.getCards()).rejects.toThrow(
      'Something went wrong'
    );
  });
});

describe('ClientCardService.createCard', () => {
  it('returns created card on success', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: mockCard }));
    const card = await ClientCardService.createCard('Hund', 'собака');
    expect(card).toEqual(mockCard);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/cards',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ error: 'Validation failed' }, false)
    );
    await expect(
      ClientCardService.createCard('Hund', 'собака')
    ).rejects.toThrow('Validation failed');
  });
});

describe('ClientCardService.updateCard', () => {
  it('returns updated card on success', async () => {
    const updated: Card = { ...mockCard, translation: 'пёс' };
    mockFetch.mockResolvedValue(makeFetchResponse({ data: updated }));
    const result = await ClientCardService.updateCard('1', {
      translation: 'пёс',
    });
    expect(result.translation).toBe('пёс');
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ error: 'Not found' }, false)
    );
    await expect(
      ClientCardService.updateCard('1', { translation: 'x' })
    ).rejects.toThrow('Not found');
  });
});

describe('ClientCardService.deleteCard', () => {
  it('resolves on success', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: null }));
    await expect(ClientCardService.deleteCard('1')).resolves.toBeUndefined();
  });

  it('throws on error', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ error: 'Not found' }, false)
    );
    await expect(ClientCardService.deleteCard('1')).rejects.toThrow(
      'Not found'
    );
  });
});

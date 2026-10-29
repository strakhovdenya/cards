import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClientCardService } from '@/services/cardService';
import { ClientVerbService } from '@/services/verbService';
import { ApiRequestError } from '@/services/apiResponse';
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

  it('propagates the server error message verbatim (409 duplicate)', async () => {
    const message = 'Карточка с таким немецким словом уже существует';
    mockFetch.mockResolvedValue(makeFetchResponse({ error: message }, false));
    await expect(
      ClientCardService.createCard('Hund', 'собака')
    ).rejects.toMatchObject({
      name: 'ApiRequestError',
      message,
      outcome: 'rejected',
    });
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

describe('ClientCardService network failures', () => {
  it('rejected fetch on mutation is unknown outcome', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await ClientCardService.createCard('Hund', 'собака').catch(
      (caught: unknown) => caught
    );
    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).outcome).toBe('unknown');
  });
});

describe('ClientCardService mutation results', () => {
  const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const sentCard = { id: '1', germanWord: 'Hund', translation: 'собака' };

  it('create card returns success', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: sentCard }, 201));
    const result = await ClientCardService.createCardWithResult(
      'Hund',
      'собака',
      ['t1']
    );
    expect(result).toEqual({ status: 'success', data: sentCard });
  });

  it('create card returns partial when tags not attached', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ data: sentCard, tagsAttached: false }, 201)
    );
    const result = await ClientCardService.createCardWithResult(
      'Hund',
      'собака',
      ['t1']
    );
    expect(result).toEqual({
      status: 'partial',
      data: sentCard,
      details: { kind: 'tagsNotAttached' },
    });
  });

  it('create card returns rejected for conflict', async () => {
    const message = 'Карточка «Hund» уже существует';
    mockFetch.mockResolvedValue(jsonResponse({ error: message }, 409));
    const result = await ClientCardService.createCardWithResult(
      'Hund',
      'собака'
    );
    expect(result).toEqual({ status: 'rejected', message, httpStatus: 409 });
  });

  it('bulk create returns partial with failed items', async () => {
    const failed = [
      { index: 1, germanWord: 'Katze', reason: 'duplicate', created: false },
      {
        index: 2,
        germanWord: 'Maus',
        reason: 'Card created, but fetching it failed',
        created: true,
      },
    ];
    mockFetch.mockResolvedValue(
      jsonResponse({ data: [sentCard], failed, message: '1 of 3' }, 201)
    );
    const result = await ClientCardService.createBulkCardsWithResult([
      { germanWord: 'Hund', translation: 'собака' },
      { germanWord: 'Katze', translation: 'кошка' },
      { germanWord: 'Maus', translation: 'мышь' },
    ]);
    expect(result).toEqual({
      status: 'partial',
      data: [sentCard],
      details: { kind: 'bulkFailed', failed },
    });
  });

  it('bulk create without failures returns success', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ data: [sentCard], failed: [] }, 201)
    );
    const result = await ClientCardService.createBulkCardsWithResult([
      { germanWord: 'Hund', translation: 'собака' },
    ]);
    expect(result).toEqual({ status: 'success', data: [sentCard] });
  });

  it('update card returns unknown on gateway html', async () => {
    mockFetch.mockResolvedValue(
      new Response('<html>504 Gateway Timeout</html>', { status: 504 })
    );
    const result = await ClientCardService.updateCardWithResult('1', {
      translation: 'пёс',
    });
    expect(result).toMatchObject({ status: 'unknown', httpStatus: 504 });
  });

  it('update card returns rejected for json server error', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: 'Failed to update card' }, 500)
    );
    const result = await ClientCardService.updateCardWithResult('1', {
      translation: 'пёс',
    });
    expect(result).toEqual({
      status: 'rejected',
      message: 'Failed to update card',
      httpStatus: 500,
    });
  });

  it('delete card returns unknown on rejected fetch', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await ClientCardService.deleteCardWithResult('1');
    expect(result).toMatchObject({ status: 'unknown', httpStatus: null });
  });

  it('legacy methods keep return types', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: sentCard, tagsAttached: false }, 201)
    );
    expect(await ClientCardService.createCard('Hund', 'собака')).toEqual(
      sentCard
    );

    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [sentCard], failed: [] }, 201)
    );
    expect(
      await ClientCardService.createBulkCards([
        { germanWord: 'Hund', translation: 'собака' },
      ])
    ).toEqual([sentCard]);

    mockFetch.mockResolvedValueOnce(jsonResponse({ data: sentCard }, 200));
    expect(
      await ClientCardService.updateCard('1', { translation: 'пёс' })
    ).toEqual(sentCard);

    mockFetch.mockResolvedValueOnce(jsonResponse({ data: null }, 200));
    await expect(ClientCardService.deleteCard('1')).resolves.toBeUndefined();

    const sentVerb = { id: 'v1', infinitive: 'laufen', translation: 'бегать' };
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: sentVerb }, 201));
    expect(
      await ClientVerbService.createVerb({
        infinitive: 'laufen',
        translation: 'бегать',
        conjugations: [],
      })
    ).toEqual(sentVerb);

    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Conflict' }, 409));
    await expect(
      ClientCardService.createCard('Hund', 'собака')
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

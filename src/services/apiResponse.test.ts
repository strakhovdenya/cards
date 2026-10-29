import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ApiRequestError,
  apiRequest,
  parseApiResponse,
} from '@/services/apiResponse';

function makeResponse(status: number, body: string): Response {
  return new Response(body, { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseApiResponse', () => {
  it('returns data for successful json response', async () => {
    const response = makeResponse(200, JSON.stringify({ data: { id: '1' } }));
    await expect(parseApiResponse(response, false)).resolves.toEqual({
      id: '1',
    });
  });

  it('maps html gateway error to readable message', async () => {
    const response = makeResponse(504, '<html>Gateway Timeout</html>');
    const error = await parseApiResponse(response, false).catch(
      (caught: unknown) => caught
    );
    expect(error).toBeInstanceOf(ApiRequestError);
    const { message } = error as ApiRequestError;
    expect(message).toMatch(/[а-яё]/i);
    expect(message).toContain('504');
    expect(message).not.toContain('SyntaxError');
  });

  it('maps empty error body to readable message', async () => {
    const response = makeResponse(502, '');
    const error = (await parseApiResponse(response, false).catch(
      (caught: unknown) => caught
    )) as ApiRequestError;
    expect(error.message).toMatch(/[а-яё]/i);
    expect(error.message).toContain('502');
    expect(error.status).toBe(502);
  });

  it('marks non-json mutation response as unknown outcome', async () => {
    const response = makeResponse(200, '<html>oops</html>');
    const error = (await parseApiResponse(response, true).catch(
      (caught: unknown) => caught
    )) as ApiRequestError;
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.outcome).toBe('unknown');
  });

  it('keeps server message for json errors', async () => {
    const response = makeResponse(409, JSON.stringify({ error: 'Дубликат' }));
    const error = (await parseApiResponse(response, true).catch(
      (caught: unknown) => caught
    )) as ApiRequestError;
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.message).toBe('Дубликат');
    expect(error.outcome).toBe('rejected');
  });

  it('treats a json array body as unreadable', async () => {
    const response = makeResponse(200, '[]');
    await expect(parseApiResponse(response, true)).rejects.toMatchObject({
      outcome: 'unknown',
    });
  });

  it('throws when success status carries error field', async () => {
    const response = makeResponse(200, JSON.stringify({ error: 'Сбой' }));
    await expect(parseApiResponse(response, false)).rejects.toThrow('Сбой');
  });
});

describe('apiRequest', () => {
  it('read request failure is not unknown outcome', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const error = (await apiRequest('/api/cards').catch(
      (caught: unknown) => caught
    )) as ApiRequestError;
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.outcome).not.toBe('unknown');
  });

  it('marks rejected fetch on mutation as unknown outcome', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const error = (await apiRequest('/api/cards', { method: 'DELETE' }).catch(
      (caught: unknown) => caught
    )) as ApiRequestError;
    expect(error.outcome).toBe('unknown');
  });
});

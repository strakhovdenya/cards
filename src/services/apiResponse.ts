import type { ApiResponse } from '@/types';

// rejected — сервер подтвердил отказ; unknown — запрос мог выполниться,
// но ответа нет или он нечитаем
export type ApiOutcome = 'rejected' | 'unknown';

export class ApiRequestError extends Error {
  readonly outcome: ApiOutcome;
  readonly status: number | null;

  constructor(message: string, outcome: ApiOutcome, status: number | null) {
    super(message);
    this.name = 'ApiRequestError';
    this.outcome = outcome;
    this.status = status;
  }
}

const READ_METHODS = new Set(['GET', 'HEAD']);

const isMutationInit = (init?: RequestInit): boolean => {
  const method = (init?.method ?? 'GET').toUpperCase();
  return !READ_METHODS.has(method);
};

// null — тело пустое или не JSON
const readJson = async (
  response: Response
): Promise<ApiResponse<unknown> | null> => {
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (Array.isArray(parsed)) return null;
    return parsed as ApiResponse<unknown>;
  } catch {
    return null;
  }
};

// Единый разбор ответа API. Для мутации нечитаемый ответ означает, что
// результат неизвестен: шлюзовая 5xx не доказывает, что запись не выполнена
export async function parseApiResponse<T>(
  response: Response,
  isMutation: boolean
): Promise<T> {
  const body = await readJson(response);

  if (body === null) {
    throw new ApiRequestError(
      `Сервер вернул непонятный ответ (код ${response.status}). Попробуйте позже.`,
      isMutation ? 'unknown' : 'rejected',
      response.status
    );
  }

  if (body.error) {
    throw new ApiRequestError(body.error, 'rejected', response.status);
  }

  if (!response.ok) {
    throw new ApiRequestError(
      `Ошибка API (код ${response.status})`,
      isMutation ? 'unknown' : 'rejected',
      response.status
    );
  }

  return body.data as T;
}

// fetch, в котором сетевой сбой становится ApiRequestError
export async function apiFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    const isMutation = isMutationInit(init);
    throw new ApiRequestError(
      isMutation
        ? 'Нет ответа от сервера. Результат операции неизвестен, проверьте соединение.'
        : 'Не удалось связаться с сервером. Проверьте соединение.',
      isMutation ? 'unknown' : 'rejected',
      null
    );
  }
}

export async function apiRequest<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await apiFetch(url, init);
  return parseApiResponse<T>(response, isMutationInit(init));
}

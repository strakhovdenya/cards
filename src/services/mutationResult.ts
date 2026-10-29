import type { BulkCardFailure } from '@/types';
import {
  ApiRequestError,
  apiFetch,
  parseApiResponse,
} from '@/services/apiResponse';

// Что именно не применилось при частичном успехе
export type PartialDetails =
  | { kind: 'tagsNotAttached' }
  | { kind: 'bulkFailed'; failed: BulkCardFailure[] };

// rejected — сервер подтвердил отказ; unknown — запрос мог выполниться,
// подтверждения нет. Исход unknown нельзя трактовать как отказ: перед
// повтором состояние сверяется через reconcile
export type MutationResult<T> =
  | { status: 'success'; data: T }
  | { status: 'partial'; data: T; details: PartialDetails }
  | { status: 'rejected'; message: string; httpStatus: number | null }
  | { status: 'unknown'; message: string; httpStatus: number | null };

export type ResponseBody = Record<string, unknown>;

// Ищет в теле успешного ответа сигналы частичного сбоя рядом с data
export type PartialDetector = (body: ResponseBody) => PartialDetails | null;

const NO_PARTIAL: PartialDetector = () => null;

const fromApiError = <T>(error: ApiRequestError): MutationResult<T> => ({
  status: error.outcome,
  message: error.message,
  httpStatus: error.status,
});

export async function requestMutation<T>(
  url: string,
  init: RequestInit,
  detectPartial: PartialDetector = NO_PARTIAL
): Promise<MutationResult<T>> {
  let response: Response;
  try {
    response = await apiFetch(url, init);
  } catch (error) {
    if (!(error instanceof ApiRequestError)) throw error;
    return fromApiError(error);
  }

  // Запрос уже отправлен: сбой при обработке ответа не доказывает, что запись
  // не выполнена, поэтому он становится unknown, а не исключением для
  // вызывающего, который мог бы принять его за отказ и повторить мутацию
  try {
    // Копия нужна до разбора: parseApiResponse читает тело оригинала
    const copy = response.clone();
    const data = await parseApiResponse<T>(response, true);
    const body = (await copy.json()) as ResponseBody;
    const details = detectPartial(body);
    if (details) return { status: 'partial', data, details };
    return { status: 'success', data };
  } catch (error) {
    if (error instanceof ApiRequestError) return fromApiError(error);
    console.error('Failed to handle mutation response:', error);
    return {
      status: 'unknown',
      message:
        'Не удалось обработать ответ сервера. Результат операции неизвестен.',
      httpStatus: response.status,
    };
  }
}

// Перечитывает состояние с сервера и проверяет, применилась ли мутация.
// Саму мутацию не повторяет; ошибка перечитывания пробрасывается
export async function reconcile<S>(
  refetch: () => Promise<S>,
  isPresent: (state: S) => boolean
): Promise<{ found: boolean }> {
  const state = await refetch();
  return { found: isPresent(state) };
}

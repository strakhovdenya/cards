import type { ApiResponse, Card } from '@/types';

const API_BASE_URL = '/api/nouns';

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = (await response.json()) as ApiResponse<null>;
    throw new Error(errorData.error ?? 'Ошибка API');
  }

  const data = (await response.json()) as ApiResponse<T>;
  if (data.error) {
    throw new Error(data.error);
  }

  return data.data!;
}

export class ClientNounService {
  static async getNouns(): Promise<Card[]> {
    const response = await fetch(API_BASE_URL, {
      credentials: 'include',
    });
    return handleApiResponse<Card[]>(response);
  }
}

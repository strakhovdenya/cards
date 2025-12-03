import type { ApiResponse, Card } from '@/types';

interface ServiceOptions {
  guest?: boolean;
}

const API_BASE_URL = '/api/nouns';

const buildUrl = (path: string, options?: ServiceOptions) => {
  if (!options?.guest) return path;
  return `${path}${path.includes('?') ? '&' : '?'}guest=1`;
};

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
  static async getNouns(options?: ServiceOptions): Promise<Card[]> {
    const response = await fetch(buildUrl(API_BASE_URL, options), {
      credentials: 'include',
    });
    return handleApiResponse<Card[]>(response);
  }
}

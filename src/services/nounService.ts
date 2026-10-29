import type { Card } from '@/types';
import { apiRequest } from '@/services/apiResponse';

interface ServiceOptions {
  guest?: boolean;
}

const API_BASE_URL = '/api/nouns';

const buildUrl = (path: string, options?: ServiceOptions) => {
  if (!options?.guest) return path;
  return `${path}${path.includes('?') ? '&' : '?'}guest=1`;
};

export class ClientNounService {
  static async getNouns(options?: ServiceOptions): Promise<Card[]> {
    return apiRequest<Card[]>(buildUrl(API_BASE_URL, options), {
      credentials: 'include',
    });
  }
}

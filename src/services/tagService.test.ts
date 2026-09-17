import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClientTagService } from '@/services/tagService';
import type { Tag } from '@/types';

const mockTag: Tag = {
  id: 't1',
  name: 'A1',
  color: '#2196f3',
  user_id: 'user1',
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
  ClientTagService.clearCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClientTagService.getTags', () => {
  it('returns tags on success', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockTag] }));
    const tags = await ClientTagService.getTags();
    expect(tags).toEqual([mockTag]);
  });

  it('throws when response.ok is false', async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ error: 'Unauthorized' }, false)
    );
    await expect(ClientTagService.getTags()).rejects.toThrow('Unauthorized');
  });

  it('throws default message when response.ok is false and no error field', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({}, false));
    await expect(ClientTagService.getTags()).rejects.toThrow('Ошибка API');
  });

  it('throws when response.ok is true but data.error is set', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ error: 'Service error' }));
    await expect(ClientTagService.getTags()).rejects.toThrow('Service error');
  });

  it('uses cache on second call without forceRefresh', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockTag] }));
    await ClientTagService.getTags();
    await ClientTagService.getTags();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache with forceRefresh=true', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockTag] }));
    await ClientTagService.getTags();
    await ClientTagService.getTags(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('bypasses cache when guest=true', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockTag] }));
    await ClientTagService.getTags(false, { guest: true });
    await ClientTagService.getTags(false, { guest: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('ClientTagService cache invalidation', () => {
  it('invalidates cache after createTag', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockTag] }));
    await ClientTagService.getTags();
    mockFetch.mockResolvedValue(
      makeFetchResponse({
        data: { ...mockTag, id: 't2', name: 'B2' },
      })
    );
    await ClientTagService.createTag('B2');
    mockFetch.mockResolvedValue(
      makeFetchResponse({
        data: [mockTag, { ...mockTag, id: 't2', name: 'B2' }],
      })
    );
    await ClientTagService.getTags();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('invalidates cache after updateTag', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockTag] }));
    await ClientTagService.getTags();
    mockFetch.mockResolvedValue(
      makeFetchResponse({ data: { ...mockTag, name: 'Updated' } })
    );
    await ClientTagService.updateTag('t1', { name: 'Updated' });
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockTag] }));
    await ClientTagService.getTags();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('invalidates cache after deleteTag', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockTag] }));
    await ClientTagService.getTags();
    mockFetch.mockResolvedValue(makeFetchResponse({ data: null }));
    await ClientTagService.deleteTag('t1');
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }));
    await ClientTagService.getTags();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('clearCache resets cache so next getTags fetches fresh data', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [mockTag] }));
    await ClientTagService.getTags();
    ClientTagService.clearCache();
    await ClientTagService.getTags();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

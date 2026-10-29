import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Фикстура базы, которая действительно применяет фильтр eq: без фильтра
// по демо-аккаунту тест увидел бы глагол другого владельца
const fake = vi.hoisted(() => {
  interface Call {
    method: string;
    args: unknown[];
  }

  const calls: Call[] = [];
  const state = { rows: [] as Array<Record<string, unknown>> };

  const createBuilder = () => {
    let rows = state.rows;
    const builder: Record<string, unknown> = {};
    const record = (method: string, args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
    builder.select = (...args: unknown[]) => record('select', args);
    builder.order = (...args: unknown[]) => record('order', args);
    builder.eq = (column: string, value: unknown) => {
      rows = rows.filter((row) => row[column] === value);
      return record('eq', [column, value]);
    };
    for (const method of ['insert', 'update', 'delete', 'upsert']) {
      builder[method] = (...args: unknown[]) => record(method, args);
    }
    builder.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(resolve({ data: rows, error: null }));
    return builder;
  };

  const serviceClient = {
    from: vi.fn((table: string) => {
      calls.push({ method: 'from', args: [table] });
      return createBuilder();
    }),
  };

  const routeClient = {
    auth: { getUser: vi.fn(), getSession: vi.fn() },
    from: vi.fn(),
  };

  return { calls, state, serviceClient, routeClient };
});

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: vi.fn(() => fake.serviceClient),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn(), getAll: () => [] })),
}));
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => fake.routeClient),
}));

const { GET } = await import('./route');

const DEMO_USER_ID = 'user-demo';
const NOW = '2026-10-29T00:00:00.000Z';

const verbRow = (id: string, userId: string) => ({
  id,
  infinitive: `${id}-inf`,
  translation: `${id}-ru`,
  conjugations: [],
  user_id: userId,
  learned: false,
  created_at: NOW,
  updated_at: NOW,
});

const guestRequest = () =>
  new NextRequest('https://cards.test/api/verbs/random?guest=1');

const MUTATIONS = ['insert', 'update', 'delete', 'upsert'];

describe('GET /api/verbs/random guest', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fake.calls.length = 0;
    fake.serviceClient.from.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('guest random verb reads only demo data', async () => {
    vi.stubEnv('DEMO_USER_ID', DEMO_USER_ID);
    fake.state.rows = [
      verbRow('foreign-1', 'user-other'),
      verbRow('demo-1', DEMO_USER_ID),
      verbRow('foreign-2', 'user-other'),
    ];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await GET(guestRequest());
      const body = (await response.json()) as { data: { id: string } };
      expect(response.status).toBe(200);
      expect(body.data.id).toBe('demo-1');
    }

    expect(fake.calls).toContainEqual({
      method: 'eq',
      args: ['user_id', DEMO_USER_ID],
    });
    const mutations = fake.calls.filter((call) =>
      MUTATIONS.includes(call.method)
    );
    expect(mutations).toEqual([]);
    expect(fake.routeClient.auth.getUser).not.toHaveBeenCalled();
    expect(fake.routeClient.from).not.toHaveBeenCalled();
  });

  it('missing configuration and empty demo deck never broaden guest access', async () => {
    fake.state.rows = [verbRow('foreign-1', 'user-other')];

    vi.stubEnv('DEMO_USER_ID', '');
    const unconfigured = await GET(guestRequest());
    expect(unconfigured.status).toBe(500);
    expect(fake.serviceClient.from).not.toHaveBeenCalled();

    vi.stubEnv('DEMO_USER_ID', DEMO_USER_ID);
    const empty = await GET(guestRequest());
    expect(empty.status).toBe(404);

    const queries = fake.calls.filter((call) => call.method === 'from');
    const filters = fake.calls.filter((call) => call.method === 'eq');
    expect(queries).toHaveLength(1);
    expect(filters).toEqual([
      { method: 'eq', args: ['user_id', DEMO_USER_ID] },
    ]);
    expect(fake.routeClient.auth.getUser).not.toHaveBeenCalled();
    expect(fake.routeClient.from).not.toHaveBeenCalled();
  });
});

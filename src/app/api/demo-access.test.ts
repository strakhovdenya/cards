import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Настоящие handlers и настоящий auth-server: подменены только cookie,
// клиент Supabase (Auth + таблицы с записью вызовов) и service-role клиент
const fake = vi.hoisted(() => {
  interface Call {
    client: 'route' | 'service';
    table: string;
    method: string;
    args: unknown[];
  }

  const NOW = '2026-10-29T00:00:00.000Z';
  const USER_ID = 'user-regular';
  const ROWS: Record<string, Record<string, unknown>> = {
    cards: {
      id: 'card-1',
      german_word: 'Haus',
      translation: 'дом',
      user_id: USER_ID,
      learned: false,
      created_at: NOW,
      updated_at: NOW,
      tags: [],
    },
    tags: {
      id: 'tag-1',
      name: 'Тег',
      color: '#123456',
      user_id: USER_ID,
      created_at: NOW,
      updated_at: NOW,
    },
    verbs: {
      id: 'verb-1',
      infinitive: 'gehen',
      translation: 'идти',
      conjugations: [],
      examples: null,
      user_id: USER_ID,
      learned: false,
      created_at: NOW,
      updated_at: NOW,
    },
    card_tags: {},
  };

  const calls: Call[] = [];

  const createBuilder = (client: Call['client'], table: string) => {
    let isSingle = false;
    const builder: Record<string, unknown> = {};
    const chain =
      (method: string) =>
      (...args: unknown[]) => {
        calls.push({ client, table, method, args });
        if (method === 'single' || method === 'maybeSingle') isSingle = true;
        return builder;
      };
    for (const method of [
      'select',
      'insert',
      'update',
      'delete',
      'eq',
      'in',
      'order',
      'single',
      'maybeSingle',
    ]) {
      builder[method] = chain(method);
    }
    builder.then = (resolve: (value: unknown) => unknown) => {
      const row = ROWS[table];
      return Promise.resolve(
        resolve({ data: isSingle ? row : [row], error: null })
      );
    };
    return builder;
  };

  const createClient = (client: Call['client']) => ({
    auth: { getUser: vi.fn(), getSession: vi.fn() },
    from: (table: string) => {
      calls.push({ client, table, method: 'from', args: [table] });
      return createBuilder(client, table);
    },
  });

  return {
    USER_ID,
    calls,
    routeClient: createClient('route'),
    serviceClient: createClient('service'),
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn(), getAll: () => [] })),
}));
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => fake.routeClient),
}));
vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: vi.fn(() => fake.serviceClient),
}));

const { getServiceSupabase } = await import('@/lib/supabase');

const DEMO_USER_ID = 'user-demo';
const OTHER_OWNER_ID = 'user-other-owner';
const ORIGIN = 'https://cards-indol-eight.vercel.app';
const API_DIR = path.resolve(__dirname);

type Handler = (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => Promise<Response>;

interface Operation {
  key: string;
  file: string;
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body: Record<string, unknown> | null;
  status: number;
}

const CONJUGATIONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie / Sie'].map(
  (person) => ({ person, form: 'mache', translation: 'делаю' })
);

const VERB = {
  infinitive: 'machen',
  translation: 'делать',
  conjugations: CONJUGATIONS,
};

// Матрица закрытых операций: 11 изменяющих экспортов src/app/api
const OPERATIONS: Operation[] = [
  {
    key: 'POST /api/cards',
    file: 'cards/route.ts',
    method: 'POST',
    path: '/api/cards',
    body: { germanWord: 'Baum', translation: 'дерево', tagIds: ['tag-1'] },
    status: 201,
  },
  {
    key: 'POST /api/cards/bulk',
    file: 'cards/bulk/route.ts',
    method: 'POST',
    path: '/api/cards/bulk',
    body: {
      cards: [{ germanWord: 'Baum', translation: 'дерево', tagIds: ['tag-1'] }],
    },
    status: 201,
  },
  {
    key: 'PUT /api/cards/[id]',
    file: 'cards/[id]/route.ts',
    method: 'PUT',
    path: '/api/cards/card-1',
    body: { learned: true, tagIds: ['tag-1'] },
    status: 200,
  },
  {
    key: 'DELETE /api/cards/[id]',
    file: 'cards/[id]/route.ts',
    method: 'DELETE',
    path: '/api/cards/card-1',
    body: null,
    status: 200,
  },
  {
    key: 'POST /api/verbs',
    file: 'verbs/route.ts',
    method: 'POST',
    path: '/api/verbs',
    body: VERB,
    status: 201,
  },
  {
    key: 'POST /api/verbs/bulk',
    file: 'verbs/bulk/route.ts',
    method: 'POST',
    path: '/api/verbs/bulk',
    body: { verbs: [VERB] },
    status: 200,
  },
  {
    key: 'PUT /api/verbs/[id]',
    file: 'verbs/[id]/route.ts',
    method: 'PUT',
    path: '/api/verbs/verb-1',
    body: { learned: true },
    status: 200,
  },
  {
    key: 'DELETE /api/verbs/[id]',
    file: 'verbs/[id]/route.ts',
    method: 'DELETE',
    path: '/api/verbs/verb-1',
    body: null,
    status: 200,
  },
  {
    key: 'POST /api/tags',
    file: 'tags/route.ts',
    method: 'POST',
    path: '/api/tags',
    body: { name: 'Новый', color: '#ff0000' },
    status: 201,
  },
  {
    key: 'PUT /api/tags/[id]',
    file: 'tags/[id]/route.ts',
    method: 'PUT',
    path: '/api/tags/tag-1',
    body: { name: 'Другой' },
    status: 200,
  },
  {
    key: 'DELETE /api/tags/[id]',
    file: 'tags/[id]/route.ts',
    method: 'DELETE',
    path: '/api/tags/tag-1',
    body: null,
    status: 200,
  },
];

const loadHandler = async (file: string, method: string) => {
  const url = pathToFileURL(path.join(API_DIR, file)).href;
  const routeModule = (await import(url)) as Record<string, unknown>;
  return routeModule[method] as Handler;
};

const idFromPath = (requestPath: string) => requestPath.split('/')[3] ?? '';

interface CallOptions {
  query?: Record<string, string>;
  body?: Record<string, unknown> | null;
  rawBody?: string;
  headers?: Record<string, string>;
}

const callOperation = async (
  operation: Operation,
  { query = {}, body = operation.body, rawBody, headers = {} }: CallOptions = {}
) => {
  const handler = await loadHandler(operation.file, operation.method);
  const url = new URL(operation.path, ORIGIN);
  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, value);
  }
  const payload = rawBody ?? (body ? JSON.stringify(body) : undefined);
  const request = new NextRequest(url, {
    method: operation.method,
    headers: { 'content-type': 'application/json', ...headers },
    body: payload,
  });
  return handler(request, {
    params: Promise.resolve({ id: idFromPath(operation.path) }),
  });
};

const tableCalls = () => fake.calls.filter((call) => call.method === 'from');

const writtenValues = () =>
  fake.calls
    .filter((call) => call.method === 'insert' || call.method === 'update')
    .map((call) => call.args[0]);

const verifiedUser = (id: string) => ({
  data: { user: { id, email: `${id}@example.com` } },
  error: null,
});

const sessionWithUser = (id: string) => ({
  data: { session: { user: { id } } },
  error: null,
});

const NO_USER = { data: { user: null }, error: null };
const AUTH_ERROR = {
  data: { user: null },
  error: { message: 'invalid JWT', status: 401 },
};

const getUser = fake.routeClient.auth.getUser;
const getSession = fake.routeClient.auth.getSession;

describe('mutation handlers access', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubEnv('DEMO_USER_ID', DEMO_USER_ID);
    fake.calls.length = 0;
    getUser.mockReset();
    getSession.mockReset();
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    vi.mocked(getServiceSupabase).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('mutation matrix covers every mutating export', async () => {
    const routeFiles = readdirSync(API_DIR, { recursive: true })
      .map(String)
      .filter((file) => path.basename(file) === 'route.ts');
    const mutating = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
    const found: string[] = [];

    for (const file of routeFiles) {
      const url = pathToFileURL(path.join(API_DIR, file)).href;
      const routeModule = (await import(url)) as Record<string, unknown>;
      const routeDir = path.dirname(file).split(path.sep).join('/');
      for (const name of Object.keys(routeModule)) {
        if (mutating.has(name)) found.push(`${name} /api/${routeDir}`);
      }
    }

    const expected = OPERATIONS.map((operation) => operation.key);
    expect(routeFiles.length).toBeGreaterThan(5);
    expect(found.toSorted()).toEqual(expected.toSorted());
  });

  it('all mutation handlers reject unauthenticated requests before data access', async () => {
    getUser.mockResolvedValue(NO_USER);

    for (const operation of OPERATIONS) {
      fake.calls.length = 0;
      const response = await callOperation(operation);
      expect(response.status, operation.key).toBe(401);
      expect(tableCalls(), operation.key).toEqual([]);
    }
  });

  it('unverified session never authorizes mutation handlers', async () => {
    getSession.mockResolvedValue(sessionWithUser(fake.USER_ID));

    for (const answer of [AUTH_ERROR, NO_USER]) {
      getUser.mockResolvedValue(answer);
      for (const operation of OPERATIONS) {
        fake.calls.length = 0;
        const response = await callOperation(operation);
        expect(response.status, operation.key).toBe(401);
        expect(tableCalls(), operation.key).toEqual([]);
      }
    }
    expect(getUser).toHaveBeenCalledTimes(OPERATIONS.length * 2);
  });

  it('verified demo user cannot mutate', async () => {
    getUser.mockResolvedValue(verifiedUser(DEMO_USER_ID));

    for (const query of [{ guest: '1' }, {}] as Record<string, string>[]) {
      for (const operation of OPERATIONS) {
        fake.calls.length = 0;
        const response = await callOperation(operation, { query });
        expect(response.status, operation.key).toBe(403);
        expect(tableCalls(), operation.key).toEqual([]);
      }
    }
  });

  it('request controlled flags cannot grant mutation access', async () => {
    getUser.mockResolvedValue(NO_USER);
    const forged = {
      user_id: DEMO_USER_ID,
      role: 'admin',
      isGuest: 'false',
    };
    const variants: CallOptions[] = [
      { query: { guest: '0' } },
      { query: { guest: '1' } },
      { query: {} },
      { query: forged },
      { query: { guest: '1', ...forged } },
      { headers: { origin: ORIGIN, referer: `${ORIGIN}/demo` } },
      { rawBody: '{not json' },
    ];

    for (const operation of OPERATIONS) {
      const forgedBody = { ...(operation.body ?? {}), ...forged };
      for (const variant of [...variants, { body: forgedBody }]) {
        fake.calls.length = 0;
        const response = await callOperation(operation, variant);
        expect(response.status, operation.key).toBe(401);
        expect(tableCalls(), operation.key).toEqual([]);
      }
    }
  });

  it('verified regular user keeps mutation capabilities', async () => {
    getUser.mockResolvedValue(verifiedUser(fake.USER_ID));

    for (const operation of OPERATIONS) {
      fake.calls.length = 0;
      const response = await callOperation(operation);
      expect(response.status, operation.key).toBe(operation.status);
      const tables = tableCalls();
      expect(tables.length, operation.key).toBeGreaterThan(0);
      expect(tables.every((call) => call.client === 'route')).toBe(true);
    }
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it('verb update ignores ownership fields from body', async () => {
    getUser.mockResolvedValue(verifiedUser(fake.USER_ID));
    const operation = OPERATIONS.find(
      (item) => item.key === 'PUT /api/verbs/[id]'
    )!;

    const response = await callOperation(operation, {
      body: {
        translation: 'ходить',
        learned: true,
        user_id: OTHER_OWNER_ID,
        id: 'verb-other',
        created_at: '2000-01-01T00:00:00.000Z',
        unknown_field: 'x',
      },
    });

    expect(response.status).toBe(200);
    const updates = fake.calls.filter((call) => call.method === 'update');
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0]).toEqual({
      translation: 'ходить',
      learned: true,
    });
    const allowed = [
      'infinitive',
      'translation',
      'conjugations',
      'examples',
      'learned',
    ];
    for (const key of Object.keys(updates[0].args[0] as object)) {
      expect(allowed).toContain(key);
    }
  });

  it('card and tag writes ignore ownership fields from body', async () => {
    getUser.mockResolvedValue(verifiedUser(fake.USER_ID));
    const keys = [
      'POST /api/cards',
      'POST /api/cards/bulk',
      'POST /api/tags',
      'PUT /api/cards/[id]',
      'PUT /api/tags/[id]',
    ];

    for (const key of keys) {
      const operation = OPERATIONS.find((item) => item.key === key)!;
      fake.calls.length = 0;
      const base = operation.body ?? {};
      const body =
        key === 'POST /api/cards/bulk'
          ? {
              cards: [
                {
                  germanWord: 'Baum',
                  translation: 'дерево',
                  user_id: OTHER_OWNER_ID,
                },
              ],
              user_id: OTHER_OWNER_ID,
            }
          : { ...base, user_id: OTHER_OWNER_ID };

      const response = await callOperation(operation, { body });

      expect(response.status, key).toBe(operation.status);
      const written = writtenValues();
      expect(written.length, key).toBeGreaterThan(0);
      expect(JSON.stringify(written), key).not.toContain(OTHER_OWNER_ID);
    }
  });

  it('regular user invalid payloads are rejected before writes', async () => {
    getUser.mockResolvedValue(verifiedUser(fake.USER_ID));
    const invalid: Record<string, Record<string, unknown>> = {
      'POST /api/cards': { translation: 'дом' },
      'POST /api/verbs': { infinitive: 'gehen' },
      'POST /api/tags': { color: '#ff0000' },
    };

    for (const [key, body] of Object.entries(invalid)) {
      const operation = OPERATIONS.find((item) => item.key === key)!;
      fake.calls.length = 0;
      const response = await callOperation(operation, { body });
      expect(response.status, key).toBe(400);
      expect(
        fake.calls.filter((call) => call.method === 'insert'),
        key
      ).toEqual([]);
    }
  });
});

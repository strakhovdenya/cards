import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => {
  const from = vi.fn();
  return {
    from,
    client: { auth: { getUser: vi.fn(), getSession: vi.fn() }, from },
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn(), getAll: () => [] })),
}));
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => fake.client),
}));

const { AuthError, authErrorResponse, getAuthenticatedUser } = await import(
  './auth-server'
);

const DEMO_USER_ID = 'user-demo';
const getUser = fake.client.auth.getUser;

const FAILURES = {
  error: () =>
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT' },
    }),
  'null user': () =>
    getUser.mockResolvedValue({ data: { user: null }, error: null }),
  throws: () => getUser.mockRejectedValue(new Error('network down')),
};

describe('getAuthenticatedUser', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubEnv('DEMO_USER_ID', DEMO_USER_ID);
    getUser.mockReset();
    fake.from.mockReset();
    // Сессия в cookie есть, но прав она не даёт
    fake.client.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-regular' } } },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('auth verification failures fail closed', async () => {
    let combinations = 0;
    for (const [name, arrange] of Object.entries(FAILURES)) {
      for (const mode of ['read', 'write'] as const) {
        arrange();
        const failure: unknown = await getAuthenticatedUser({ mode }).catch(
          (error: unknown) => error
        );
        expect(failure, `${name}/${mode}`).toBeInstanceOf(AuthError);
        expect((failure as InstanceType<typeof AuthError>).status).toBe(401);
        expect(authErrorResponse(failure)?.status).toBe(401);
        combinations += 1;
      }
    }
    expect(combinations).toBe(6);
    expect(fake.from).not.toHaveBeenCalled();
  });

  it('write mode refuses only the verified demo user', async () => {
    const regular = { id: 'user-regular' };
    getUser.mockResolvedValue({ data: { user: regular }, error: null });

    const allowed = await getAuthenticatedUser({ mode: 'write' });
    expect(allowed.user).toBe(regular);
    expect(allowed.supabase).toBe(fake.client);

    vi.stubEnv('DEMO_USER_ID', '');
    const unconfigured = await getAuthenticatedUser({ mode: 'write' });
    expect(unconfigured.user).toBe(regular);
    expect(unconfigured.supabase).toBe(fake.client);

    vi.stubEnv('DEMO_USER_ID', DEMO_USER_ID);
    getUser.mockResolvedValue({
      data: { user: { id: DEMO_USER_ID } },
      error: null,
    });
    const denied: unknown = await getAuthenticatedUser({ mode: 'write' }).catch(
      (error: unknown) => error
    );
    expect(authErrorResponse(denied)?.status).toBe(403);

    // Чтение собственных данных демо-аккаунтом не запрещается
    const reading = await getAuthenticatedUser();
    expect(reading.user.id).toBe(DEMO_USER_ID);
    expect(fake.from).not.toHaveBeenCalled();
  });

  it('non auth errors are not converted to responses', () => {
    expect(authErrorResponse(new Error('Unauthorized'))).toBeNull();
    expect(authErrorResponse('oops')).toBeNull();
  });
});

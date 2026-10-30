import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const fake = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createMiddlewareClient: vi.fn(() => ({
    rpc: fake.rpc,
    from: fake.from,
    auth: { getSession: fake.getSession },
  })),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, resetMs: 0 })),
}));

const { proxy } = await import('./proxy');

const mockRpc = (adminsExist: boolean, inviteValid = false) =>
  fake.rpc.mockImplementation((name: string) =>
    Promise.resolve({
      data: name === 'admins_exist' ? adminsExist : inviteValid,
      error: null,
    })
  );

const signupRequest = (query = '') =>
  new NextRequest(`http://localhost/auth/signup${query}`);

describe('proxy /auth/signup gate', () => {
  beforeEach(() => {
    fake.rpc.mockReset();
    fake.from.mockReset();
    fake.getSession.mockResolvedValue({ data: { session: null } });
  });

  it('signup with valid invite passes', async () => {
    mockRpc(true, true);

    const res = await proxy(signupRequest('?invite=code-1'));

    expect(res.headers.get('location')).toBeNull();
    expect(fake.rpc).toHaveBeenCalledWith('invite_code_is_valid', {
      code: 'code-1',
    });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it('signup without invite redirects to blocked', async () => {
    mockRpc(true);

    const res = await proxy(signupRequest());

    expect(res.headers.get('location')).toBe(
      'http://localhost/auth?blocked=true'
    );
  });

  it('signup with invalid invite redirects to invalid', async () => {
    mockRpc(true, false);

    const res = await proxy(signupRequest('?invite=bad'));

    expect(res.headers.get('location')).toBe(
      'http://localhost/auth?invalid=true'
    );
  });

  it('signup without admins passes without invite', async () => {
    mockRpc(false);

    const res = await proxy(signupRequest());

    expect(res.headers.get('location')).toBeNull();
    expect(fake.rpc).toHaveBeenCalledWith('admins_exist');
  });
});

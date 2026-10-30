import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: vi.fn(() => ({
    rpc: fake.rpc,
    from: fake.from,
    auth: { signUp: fake.signUp },
  })),
}));

const { checkIfAdminsExist, signUpWithEmail, validateInviteCode } =
  await import('./auth');

const SIGN_UP_DATA = {
  email: 'guest@example.com',
  password: 'secret123',
  firstName: 'Ann',
  lastName: 'Lee',
  inviteCode: 'code-1',
};

describe('auth invite checks', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fake.rpc.mockReset();
    fake.from.mockReset();
    fake.signUp.mockReset();
  });

  it('checkIfAdminsExist uses admins_exist rpc', async () => {
    fake.rpc.mockResolvedValue({ data: true, error: null });

    await expect(checkIfAdminsExist()).resolves.toBe(true);
    expect(fake.rpc).toHaveBeenCalledWith('admins_exist');
    expect(fake.from).not.toHaveBeenCalled();
  });

  it('checkIfAdminsExist returns false on rpc error', async () => {
    fake.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(checkIfAdminsExist()).resolves.toBe(false);
  });

  it('validateInviteCode uses invite_code_is_valid rpc', async () => {
    fake.rpc.mockResolvedValue({ data: true, error: null });

    await expect(validateInviteCode('code-1')).resolves.toBe(true);
    expect(fake.rpc).toHaveBeenCalledWith('invite_code_is_valid', {
      code: 'code-1',
    });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it('validateInviteCode returns false on rpc failure', async () => {
    fake.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(validateInviteCode('code-1')).resolves.toBe(false);
    expect(fake.rpc).toHaveBeenCalledWith('invite_code_is_valid', {
      code: 'code-1',
    });
  });
});

describe('signUpWithEmail', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fake.rpc.mockReset();
    fake.from.mockReset();
    fake.signUp.mockReset();
  });

  it('signUpWithEmail rejects invalid invite before signUp', async () => {
    fake.rpc.mockResolvedValue({ data: false, error: null });

    await expect(signUpWithEmail(SIGN_UP_DATA)).rejects.toThrow(
      'Неверный или использованный код приглашения'
    );
    expect(fake.signUp).not.toHaveBeenCalled();
  });

  it('signUpWithEmail does not update invites', async () => {
    fake.rpc.mockResolvedValue({ data: true, error: null });
    fake.signUp.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    await signUpWithEmail(SIGN_UP_DATA);

    expect(fake.signUp).toHaveBeenCalledTimes(1);
    expect(fake.from).not.toHaveBeenCalled();
  });

  it('signUpWithEmail passes invite code to the database trigger', async () => {
    fake.rpc.mockResolvedValue({ data: true, error: null });
    fake.signUp.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    await signUpWithEmail(SIGN_UP_DATA);

    expect(fake.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          data: { first_name: 'Ann', last_name: 'Lee', invite_code: 'code-1' },
        },
      })
    );
  });

  it('signUpWithEmail surfaces signUp error', async () => {
    fake.rpc.mockResolvedValue({ data: true, error: null });
    fake.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Database error saving new user' },
    });

    await expect(signUpWithEmail(SIGN_UP_DATA)).rejects.toThrow(
      'Database error saving new user'
    );
    expect(fake.from).not.toHaveBeenCalled();
  });
});

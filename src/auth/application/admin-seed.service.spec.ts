import { buildUser } from '../../../test/support/factories';
import { Role } from '../domain/role.enum';
import { AdminSeedService } from './admin-seed.service';

describe('AdminSeedService', () => {
  const users = { findByEmail: jest.fn(), create: jest.fn() };
  const hasher = { hash: jest.fn(), compare: jest.fn() };
  const config = { get: jest.fn() };
  let service: AdminSeedService;

  const configure = (email?: string, password?: string) =>
    config.get.mockImplementation((key: string) =>
      key === 'ADMIN_EMAIL'
        ? email
        : key === 'ADMIN_PASSWORD'
          ? password
          : undefined,
    );

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AdminSeedService(users, hasher, config as never);
    hasher.hash.mockResolvedValue('hashed');
  });

  it('creates an admin with a hashed password when the account does not exist', async () => {
    configure('admin@empire.org', 'Str0ng!Pass');
    users.findByEmail.mockResolvedValue(null);

    await expect(service.run()).resolves.toBe('created');

    expect(users.create).toHaveBeenCalledWith({
      email: 'admin@empire.org',
      password: 'hashed',
      role: Role.ADMIN,
    });
  });

  it('is idempotent: an existing account is left untouched', async () => {
    configure('admin@empire.org', 'Str0ng!Pass');
    users.findByEmail.mockResolvedValue(buildUser({ role: Role.ADMIN }));

    await expect(service.run()).resolves.toBe('exists');

    expect(users.create).not.toHaveBeenCalled();
  });

  it('fails loudly when the credentials are not configured', async () => {
    configure(undefined, undefined);

    await expect(service.run()).rejects.toThrow(
      'ADMIN_EMAIL and ADMIN_PASSWORD',
    );
    expect(users.create).not.toHaveBeenCalled();
  });
});

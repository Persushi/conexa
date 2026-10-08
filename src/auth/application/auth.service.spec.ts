import {
  ConflictError,
  InvalidCredentialsError,
} from '../../common/errors/domain.errors';
import { buildUser } from '../../../test/support/factories';
import { Role } from '../domain/role.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const users = { findByEmail: jest.fn(), create: jest.fn() };
  const hasher = { hash: jest.fn(), compare: jest.fn() };
  const tokens = { generate: jest.fn() };
  let service: AuthService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuthService(users, hasher, tokens);
    tokens.generate.mockResolvedValue('signed.jwt.token');
  });

  describe('register', () => {
    it('creates a regular user by default, with a hashed password and returns a token carrying the role', async () => {
      const created = buildUser();
      users.findByEmail.mockResolvedValue(null);
      hasher.hash.mockResolvedValue('hashed');
      users.create.mockResolvedValue(created);

      const result = await service.register('luke@rebels.org', 'Str0ng!Pass');

      expect(users.create).toHaveBeenCalledWith({
        email: 'luke@rebels.org',
        password: 'hashed',
        role: Role.USER,
      });
      expect(tokens.generate).toHaveBeenCalledWith({
        sub: created.id,
        email: created.email,
        role: Role.USER,
      });
      expect(result).toEqual({ access_token: 'signed.jwt.token' });
    });

    it('honours the requested role (challenge-only behaviour, see AuthService.register)', async () => {
      users.findByEmail.mockResolvedValue(null);
      hasher.hash.mockResolvedValue('hashed');
      users.create.mockResolvedValue(buildUser({ role: Role.ADMIN }));

      await service.register('boss@empire.org', 'Str0ng!Pass', Role.ADMIN);

      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
      );
      expect(tokens.generate).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
      );
    });

    it('rejects an email that is already registered without hashing or creating anything', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      await expect(
        service.register('luke@rebels.org', 'Str0ng!Pass'),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(hasher.hash).not.toHaveBeenCalled();
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a token whose role is the stored one', async () => {
      users.findByEmail.mockResolvedValue(buildUser({ role: Role.ADMIN }));
      hasher.compare.mockResolvedValue(true);

      await service.login('luke@rebels.org', 'Str0ng!Pass');

      expect(tokens.generate).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
      );
    });

    it('rejects an unknown email', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('ghost@rebels.org', 'x'),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('rejects a wrong password with the same error as an unknown email', async () => {
      users.findByEmail.mockResolvedValue(buildUser());
      hasher.compare.mockResolvedValue(false);

      await expect(service.login('luke@rebels.org', 'wrong')).rejects.toThrow(
        'Invalid credentials',
      );
      expect(tokens.generate).not.toHaveBeenCalled();
    });
  });
});

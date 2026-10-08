import { ConflictError } from '../../common/errors/domain.errors';
import { Role } from '../domain/role.enum';
import { UserMemoryRepository } from './user.memory.repository';

describe('UserMemoryRepository', () => {
  const data = {
    email: 'Luke@Rebels.org',
    password: 'hashed',
    role: Role.USER,
  };
  let repo: UserMemoryRepository;

  beforeEach(() => {
    repo = new UserMemoryRepository();
  });

  it('stores emails case-insensitively and finds them back', async () => {
    const created = await repo.create(data);

    expect(created.email).toBe('luke@rebels.org');
    await expect(repo.findByEmail('LUKE@rebels.org')).resolves.toEqual(created);
    await expect(repo.findByEmail('ghost@rebels.org')).resolves.toBeNull();
  });

  it('rejects a duplicate email, like the unique index does', async () => {
    await repo.create(data);

    await expect(
      repo.create({ ...data, email: 'luke@rebels.org' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

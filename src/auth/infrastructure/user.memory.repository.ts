import { Types } from 'mongoose';
import { ConflictError } from '../../common/errors/domain.errors';
import type { User } from '../domain/user.entity';
import type {
  CreateUserData,
  UserRepositoryPort,
} from '../domain/user.repository.port';

/** In-memory twin of UserMongooseRepository, used when MongoDB is unreachable. */
export class UserMemoryRepository implements UserRepositoryPort {
  private readonly users = new Map<string, User>();

  findByEmail(email: string): Promise<User | null> {
    const user = this.users.get(email.toLowerCase().trim());
    return Promise.resolve(user ? { ...user } : null);
  }

  create(data: CreateUserData): Promise<User> {
    const email = data.email.toLowerCase().trim();
    if (this.users.has(email)) {
      return Promise.reject(new ConflictError('Email already in use'));
    }

    const user: User = { id: new Types.ObjectId().toString(), ...data, email };
    this.users.set(email, user);
    return Promise.resolve({ ...user });
  }
}

import type { Role } from './role.enum';
import type { User } from './user.entity';

export interface CreateUserData {
  email: string;
  password: string;
  role: Role;
}

export interface UserRepositoryPort {
  findByEmail(email: string): Promise<User | null>;
  /** Throws ConflictError when the email is already taken. */
  create(data: CreateUserData): Promise<User>;
}

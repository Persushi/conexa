import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictError,
  InvalidCredentialsError,
} from '../../common/errors/domain.errors';
import {
  PASSWORD_HASHER,
  TOKEN_GENERATOR,
  USER_REPOSITORY,
} from '../../injection-tokens';
import type { PasswordHasherPort } from '../domain/password-hasher.port';
import { Role } from '../domain/role.enum';
import type { TokenGeneratorPort } from '../domain/token-generator.port';
import type { User } from '../domain/user.entity';
import type { UserRepositoryPort } from '../domain/user.repository.port';

export interface AuthResult {
  access_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
  ) {}

  /**
   * TODO(security): the caller picks the role, so anyone can sign up as an
   * admin. This is intentional for the challenge (it makes the role-based
   * access easy to exercise) and MUST change before production: self-registration
   * should always yield Role.USER, and admins should come from the seed script
   * or an admin-only endpoint.
   */
  async register(
    email: string,
    password: string,
    role: Role = Role.USER,
  ): Promise<AuthResult> {
    if (await this.users.findByEmail(email)) {
      throw new ConflictError('Email already in use');
    }

    const user = await this.users.create({
      email,
      password: await this.hasher.hash(password),
      role,
    });
    return this.issueToken(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByEmail(email);
    if (!user || !(await this.hasher.compare(password, user.password))) {
      throw new InvalidCredentialsError('Invalid credentials');
    }
    return this.issueToken(user);
  }

  private async issueToken(user: User): Promise<AuthResult> {
    const access_token = await this.tokens.generate({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { access_token };
  }
}

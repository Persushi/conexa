import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { PASSWORD_HASHER, USER_REPOSITORY } from '../../injection-tokens';
import type { PasswordHasherPort } from '../domain/password-hasher.port';
import { Role } from '../domain/role.enum';
import type { UserRepositoryPort } from '../domain/user.repository.port';

export type SeedResult = 'created' | 'exists';

/**
 * Creates the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Run it with `npm run seed` (or `node dist/seed` in production).
 * Idempotent: an existing account is never modified.
 */
@Injectable()
export class AdminSeedService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  async run(): Promise<SeedResult> {
    const email = this.config.get('ADMIN_EMAIL', { infer: true });
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });
    if (!email || !password) {
      throw new Error(
        'ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin',
      );
    }

    if (await this.users.findByEmail(email)) return 'exists';

    await this.users.create({
      email,
      password: await this.hasher.hash(password),
      role: Role.ADMIN,
    });
    return 'created';
  }
}

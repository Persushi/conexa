import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { PasswordHasherPort } from '../domain/password-hasher.port';

const SALT_ROUNDS = 12;

@Injectable()
export class BcryptAdapter implements PasswordHasherPort {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}

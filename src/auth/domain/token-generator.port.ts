import type { Role } from './role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface TokenGeneratorPort {
  generate(payload: JwtPayload): Promise<string>;
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  JwtPayload,
  TokenGeneratorPort,
} from '../domain/token-generator.port';

@Injectable()
export class JwtAdapter implements TokenGeneratorPort {
  constructor(private readonly jwtService: JwtService) {}

  generate(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync({ ...payload });
  }
}

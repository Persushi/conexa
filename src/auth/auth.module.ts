import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
  JwtModule,
  type JwtModuleOptions,
  type JwtSignOptions,
} from '@nestjs/jwt';
import type { EnvConfig } from '../config/env.validation';
import {
  PASSWORD_HASHER,
  PERSISTENCE,
  TOKEN_GENERATOR,
  USER_REPOSITORY,
} from '../injection-tokens';
import { modelFor, type Persistence } from '../persistence/persistence';
import { AdminSeedService } from './application/admin-seed.service';
import { AuthService } from './application/auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { BcryptAdapter } from './infrastructure/bcrypt.adapter';
import { JwtAdapter } from './infrastructure/jwt.adapter';
import { UserMongooseRepository } from './infrastructure/user.repository';
import { UserMemoryRepository } from './infrastructure/user.memory.repository';
import {
  UserSchema,
  UserSchemaClass,
  type UserDocument,
} from './infrastructure/user.schema';
import type { UserRepositoryPort } from './domain/user.repository.port';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<EnvConfig, true>,
      ): JwtModuleOptions => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  exports: [AdminSeedService],
  providers: [
    AuthService,
    AdminSeedService,
    {
      provide: USER_REPOSITORY,
      inject: [PERSISTENCE],
      useFactory: ({ connection }: Persistence): UserRepositoryPort =>
        connection
          ? new UserMongooseRepository(
              modelFor<UserDocument>(
                connection,
                UserSchemaClass.name,
                UserSchema,
              ),
            )
          : new UserMemoryRepository(),
    },
    { provide: PASSWORD_HASHER, useClass: BcryptAdapter },
    { provide: TOKEN_GENERATOR, useClass: JwtAdapter },
    // Order matters: authenticate first, then authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}

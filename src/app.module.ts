import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health.controller';
import { MoviesModule } from './movies/movies.module';
import { PersistenceModule } from './persistence/persistence.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PersistenceModule,
    ScheduleModule.forRoot(),
    AuthModule,
    MoviesModule,
    SyncModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { MoviesModule } from '../movies/movies.module';
import { SwapiModule } from '../swapi/swapi.module';
import { SyncMoviesService } from './application/sync-movies.service';
import { SyncController } from './sync.controller';
import { SyncScheduler } from './sync.scheduler';

@Module({
  imports: [MoviesModule, SwapiModule],
  controllers: [SyncController],
  providers: [SyncMoviesService, SyncScheduler],
})
export class SyncModule {}

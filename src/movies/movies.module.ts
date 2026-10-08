import { Module } from '@nestjs/common';
import { MOVIE_REPOSITORY, PERSISTENCE } from '../injection-tokens';
import { modelFor, type Persistence } from '../persistence/persistence';
import { MoviesService } from './application/movies.service';
import type { MovieRepositoryPort } from './domain/movie.repository.port';
import { FILMS_SNAPSHOT } from './infrastructure/films.snapshot';
import { MovieMemoryRepository } from './infrastructure/movie.memory.repository';
import { MovieMongooseRepository } from './infrastructure/movie.repository';
import {
  MovieSchema,
  MovieSchemaClass,
  type MovieDocument,
} from './infrastructure/movie.schema';
import { MoviesController } from './movies.controller';

@Module({
  controllers: [MoviesController],
  providers: [
    MoviesService,
    {
      provide: MOVIE_REPOSITORY,
      inject: [PERSISTENCE],
      useFactory: ({ connection }: Persistence): MovieRepositoryPort =>
        connection
          ? new MovieMongooseRepository(
              modelFor<MovieDocument>(
                connection,
                MovieSchemaClass.name,
                MovieSchema,
              ),
            )
          : new MovieMemoryRepository(FILMS_SNAPSHOT),
    },
  ],
  exports: [MOVIE_REPOSITORY],
})
export class MoviesModule {}

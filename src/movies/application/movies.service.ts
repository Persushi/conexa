import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../common/errors/domain.errors';
import { MOVIE_REPOSITORY } from '../../injection-tokens';
import type { Movie, MovieFields } from '../domain/movie.entity';
import type { MovieRepositoryPort } from '../domain/movie.repository.port';

export interface MoviePage {
  items: Movie[];
  total: number;
  page: number;
  limit: number;
}

export type CreateMovieInput = Omit<
  MovieFields,
  'characters' | 'planets' | 'starships' | 'vehicles' | 'species' | 'url'
> &
  Partial<MovieFields>;

@Injectable()
export class MoviesService {
  constructor(
    @Inject(MOVIE_REPOSITORY) private readonly movies: MovieRepositoryPort,
  ) {}

  async list(page: number, limit: number): Promise<MoviePage> {
    const { items, total } = await this.movies.list((page - 1) * limit, limit);
    return { items, total, page, limit };
  }

  async get(id: string): Promise<Movie> {
    const movie = await this.movies.findById(id);
    if (!movie) throw new NotFoundError('Movie not found');
    return movie;
  }

  create(input: CreateMovieInput): Promise<Movie> {
    return this.movies.create({
      ...input,
      characters: input.characters ?? [],
      planets: input.planets ?? [],
      starships: input.starships ?? [],
      vehicles: input.vehicles ?? [],
      species: input.species ?? [],
      url: input.url ?? null,
      isManual: true,
    });
  }

  /**
   * Edits are plain overwrites. Note that editing a synced movie is not
   * permanent: the next SWAPI sync restores the upstream values.
   */
  async update(id: string, changes: Partial<MovieFields>): Promise<Movie> {
    const updated = await this.movies.update(id, changes);
    if (!updated) throw new NotFoundError('Movie not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.movies.delete(id);
    if (!deleted) throw new NotFoundError('Movie not found');
  }
}

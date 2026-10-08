import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConflictError } from '../../common/errors/domain.errors';
import { MOVIE_REPOSITORY, SWAPI_PORT } from '../../injection-tokens';
import type { MovieFields } from '../../movies/domain/movie.entity';
import type {
  MovieChanges,
  MovieRepositoryPort,
  NewMovie,
} from '../../movies/domain/movie.repository.port';
import type { SwapiFilm, SwapiPort } from '../../swapi/domain/swapi.port';

export interface SyncResult {
  total: number;
  created: number;
  /** Synced movies overwritten with the upstream values, including any manual edit. */
  updated: number;
}

@Injectable()
export class SyncMoviesService {
  private readonly logger = new Logger(SyncMoviesService.name);
  private running = false;

  constructor(
    @Inject(SWAPI_PORT) private readonly swapi: SwapiPort,
    @Inject(MOVIE_REPOSITORY) private readonly movies: MovieRepositoryPort,
  ) {}

  /**
   * Upserts every SWAPI film by `swapiId`. The whole catalogue is fetched
   * before the first write, so a SWAPI outage leaves the database untouched.
   * The guard is per process: with several instances, only run the cron on one.
   */
  async run(): Promise<SyncResult> {
    if (this.running) {
      throw new ConflictError('A sync is already in progress');
    }
    this.running = true;

    try {
      const films = await this.swapi.fetchFilms();
      const existing = await this.movies.findBySwapiIds(
        films.map((f) => f.uid),
      );
      const bySwapiId = new Map(existing.map((m) => [m.swapiId, m]));

      const result: SyncResult = {
        total: films.length,
        created: 0,
        updated: 0,
      };
      for (const film of films) {
        const current = bySwapiId.get(film.uid);
        if (!current) {
          await this.movies.create(this.toNewMovie(film));
          result.created++;
        } else {
          await this.movies.update(current.id, this.toFields(film));
          result.updated++;
        }
      }

      this.logger.log(
        `Sync finished: ${result.created} created, ${result.updated} updated`,
      );
      return result;
    } finally {
      this.running = false;
    }
  }

  private toNewMovie(film: SwapiFilm): NewMovie {
    return { isManual: false, swapiId: film.uid, ...this.toFields(film) };
  }

  /** Everything the sync owns; identity (`swapiId`, `isManual`) is only written on create. */
  private toFields(film: SwapiFilm): MovieFields & MovieChanges {
    return {
      title: film.title,
      episodeId: film.episodeId,
      openingCrawl: film.openingCrawl,
      director: film.director,
      producer: film.producer,
      releaseDate: film.releaseDate,
      characters: film.characters,
      planets: film.planets,
      starships: film.starships,
      vehicles: film.vehicles,
      species: film.species,
      url: film.url,
      swapiCreated: film.created,
      swapiEdited: film.edited,
    };
  }
}

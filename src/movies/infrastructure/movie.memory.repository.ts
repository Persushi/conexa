import { Types } from 'mongoose';
import { ConflictError } from '../../common/errors/domain.errors';
import type { Movie } from '../domain/movie.entity';
import type {
  MovieChanges,
  MovieRepositoryPort,
  NewMovie,
} from '../domain/movie.repository.port';

/** In-memory twin of MovieMongooseRepository, used when MongoDB is unreachable. */
export class MovieMemoryRepository implements MovieRepositoryPort {
  private readonly items = new Map<string, Movie>();

  constructor(seed: NewMovie[] = []) {
    seed.forEach((data) => this.insert(data));
  }

  create(data: NewMovie): Promise<Movie> {
    try {
      return Promise.resolve(this.insert(data));
    } catch (error) {
      // Reject instead of throwing, exactly like the Mongo implementation does.
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  findById(id: string): Promise<Movie | null> {
    return Promise.resolve(this.copy(this.items.get(id)));
  }

  findBySwapiIds(swapiIds: string[]): Promise<Movie[]> {
    const wanted = new Set(swapiIds);
    const found = [...this.items.values()].filter(
      (m) => m.swapiId && wanted.has(m.swapiId),
    );
    return Promise.resolve(found.map((m) => structuredClone(m)));
  }

  list(
    skip: number,
    limit: number,
  ): Promise<{ items: Movie[]; total: number }> {
    const sorted = [...this.items.values()].sort(
      (a, b) =>
        a.releaseDate.localeCompare(b.releaseDate) || a.id.localeCompare(b.id),
    );
    return Promise.resolve({
      items: sorted.slice(skip, skip + limit).map((m) => structuredClone(m)),
      total: sorted.length,
    });
  }

  update(id: string, changes: MovieChanges): Promise<Movie | null> {
    const current = this.items.get(id);
    if (!current) return Promise.resolve(null);

    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, v]) => v !== undefined),
    );
    const updated: Movie = {
      ...current,
      ...structuredClone(defined),
      updatedAt: new Date(),
    };
    this.items.set(id, updated);
    return Promise.resolve(this.copy(updated));
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(this.items.delete(id));
  }

  private insert(data: NewMovie): Movie {
    if (
      data.swapiId &&
      [...this.items.values()].some((m) => m.swapiId === data.swapiId)
    ) {
      throw new ConflictError(
        `Movie with swapiId "${data.swapiId}" already exists`,
      );
    }

    const now = new Date();
    const { swapiId, swapiCreated, swapiEdited, ...fields } =
      structuredClone(data);
    const movie: Movie = {
      ...fields,
      id: new Types.ObjectId().toString(),
      swapiId: swapiId ?? null,
      swapiCreated: swapiCreated ?? null,
      swapiEdited: swapiEdited ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(movie.id, movie);
    return this.copy(movie)!;
  }

  private copy(movie: Movie | undefined): Movie | null {
    return movie ? structuredClone(movie) : null;
  }
}

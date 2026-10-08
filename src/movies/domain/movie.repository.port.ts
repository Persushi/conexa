import type { Movie, MovieFields } from './movie.entity';

export interface NewMovie extends MovieFields {
  isManual: boolean;
  swapiId?: string;
  swapiCreated?: string;
  swapiEdited?: string;
}

export interface MovieChanges extends Partial<MovieFields> {
  swapiCreated?: string;
  swapiEdited?: string;
}

export interface MovieRepositoryPort {
  create(data: NewMovie): Promise<Movie>;
  findById(id: string): Promise<Movie | null>;
  findBySwapiIds(swapiIds: string[]): Promise<Movie[]>;
  list(skip: number, limit: number): Promise<{ items: Movie[]; total: number }>;
  update(id: string, changes: MovieChanges): Promise<Movie | null>;
  delete(id: string): Promise<boolean>;
}

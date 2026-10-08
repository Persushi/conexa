import { Model } from 'mongoose';
import type { Movie } from '../domain/movie.entity';
import type {
  MovieChanges,
  MovieRepositoryPort,
  NewMovie,
} from '../domain/movie.repository.port';
import type { MovieDocument } from './movie.schema';

export class MovieMongooseRepository implements MovieRepositoryPort {
  constructor(private readonly movieModel: Model<MovieDocument>) {}

  async create(data: NewMovie): Promise<Movie> {
    const doc = await this.movieModel.create(data);
    return this.toDomain(doc);
  }

  async findById(id: string): Promise<Movie | null> {
    const doc = await this.movieModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findBySwapiIds(swapiIds: string[]): Promise<Movie[]> {
    const docs = await this.movieModel
      .find({ swapiId: { $in: swapiIds } })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async list(
    skip: number,
    limit: number,
  ): Promise<{ items: Movie[]; total: number }> {
    const [docs, total] = await Promise.all([
      this.movieModel
        .find()
        .sort({ releaseDate: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.movieModel.countDocuments().exec(),
    ]);
    return { items: docs.map((doc) => this.toDomain(doc)), total };
  }

  async update(id: string, changes: MovieChanges): Promise<Movie | null> {
    const set = Object.fromEntries(
      Object.entries(changes).filter(([, v]) => v !== undefined),
    );
    const doc = await this.movieModel
      .findByIdAndUpdate(
        id,
        { $set: set },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const doc = await this.movieModel.findByIdAndDelete(id).exec();
    return doc !== null;
  }

  private toDomain(doc: MovieDocument): Movie {
    return {
      id: doc._id.toString(),
      isManual: doc.isManual,
      swapiId: doc.swapiId ?? null,
      title: doc.title,
      episodeId: doc.episodeId,
      openingCrawl: doc.openingCrawl,
      director: doc.director,
      producer: doc.producer,
      releaseDate: doc.releaseDate,
      characters: doc.characters,
      planets: doc.planets,
      starships: doc.starships,
      vehicles: doc.vehicles,
      species: doc.species,
      url: doc.url ?? null,
      swapiCreated: doc.swapiCreated ?? null,
      swapiEdited: doc.swapiEdited ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

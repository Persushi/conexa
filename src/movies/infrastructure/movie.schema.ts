import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MovieDocument = HydratedDocument<MovieSchemaClass>;

@Schema({ collection: 'movies', timestamps: true })
export class MovieSchemaClass {
  @Prop({ type: Boolean, default: false, required: true })
  isManual: boolean;

  @Prop({ type: String })
  swapiId?: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: Number, required: true })
  episodeId: number;

  @Prop({ type: String, required: true })
  openingCrawl: string;

  @Prop({ type: String, required: true })
  director: string;

  @Prop({ type: String, required: true })
  producer: string;

  @Prop({ type: String, required: true })
  releaseDate: string;

  @Prop({ type: [String], default: [] }) characters: string[];
  @Prop({ type: [String], default: [] }) planets: string[];
  @Prop({ type: [String], default: [] }) starships: string[];
  @Prop({ type: [String], default: [] }) vehicles: string[];
  @Prop({ type: [String], default: [] }) species: string[];

  @Prop({ type: String, default: null }) url?: string | null;
  @Prop({ type: String }) swapiCreated?: string;
  @Prop({ type: String }) swapiEdited?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const MovieSchema = SchemaFactory.createForClass(MovieSchemaClass);

// Unique only for synced movies; manual ones have no swapiId at all.
MovieSchema.index(
  { swapiId: 1 },
  { unique: true, partialFilterExpression: { swapiId: { $type: 'string' } } },
);
MovieSchema.index({ releaseDate: 1, _id: 1 });

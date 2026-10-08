import { ApiProperty } from '@nestjs/swagger';
import type { Movie } from '../domain/movie.entity';

export class MovieResponseDto implements Movie {
  @ApiProperty({ example: '65f1c2a4e4b0a1b2c3d4e5f6' }) id: string;
  @ApiProperty({
    description:
      'True when created by hand by an admin; false when imported from SWAPI',
  })
  isManual: boolean;
  @ApiProperty({ type: String, nullable: true, example: '1' }) swapiId:
    string | null;
  @ApiProperty({ example: 'A New Hope' }) title: string;
  @ApiProperty({ example: 4 }) episodeId: number;
  @ApiProperty() openingCrawl: string;
  @ApiProperty({ example: 'George Lucas' }) director: string;
  @ApiProperty({ example: 'Gary Kurtz, Rick McCallum' }) producer: string;
  @ApiProperty({ example: '1977-05-25' }) releaseDate: string;
  @ApiProperty({ type: [String] }) characters: string[];
  @ApiProperty({ type: [String] }) planets: string[];
  @ApiProperty({ type: [String] }) starships: string[];
  @ApiProperty({ type: [String] }) vehicles: string[];
  @ApiProperty({ type: [String] }) species: string[];
  @ApiProperty({ type: String, nullable: true }) url: string | null;
  @ApiProperty({ type: String, nullable: true }) swapiCreated: string | null;
  @ApiProperty({ type: String, nullable: true }) swapiEdited: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class MoviePageResponseDto {
  @ApiProperty({ type: [MovieResponseDto] }) items: MovieResponseDto[];
  @ApiProperty({ example: 6 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
}

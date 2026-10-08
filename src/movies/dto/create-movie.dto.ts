import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
} from 'class-validator';

export class CreateMovieDto {
  @ApiProperty({ example: 'A New Hope' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  episodeId: number;

  @ApiProperty({ example: 'It is a period of civil war...' })
  @IsString()
  @IsNotEmpty()
  openingCrawl: string;

  @ApiProperty({ example: 'George Lucas' })
  @IsString()
  @IsNotEmpty()
  director: string;

  @ApiProperty({ example: 'Gary Kurtz, Rick McCallum' })
  @IsString()
  @IsNotEmpty()
  producer: string;

  @ApiProperty({ example: '1977-05-25', description: 'YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'releaseDate must be formatted as YYYY-MM-DD',
  })
  releaseDate: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://www.swapi.tech/api/people/1'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  characters?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  planets?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  starships?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicles?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  species?: string[];

  @ApiPropertyOptional({ example: 'https://www.swapi.tech/api/films/1' })
  @IsOptional()
  @IsUrl()
  url?: string;
}

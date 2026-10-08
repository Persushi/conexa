import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/domain/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { MoviesService } from './application/movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { ListMoviesQuery } from './dto/list-movies.query';
import { MoviePageResponseDto, MovieResponseDto } from './dto/movie.response';
import { UpdateMovieDto } from './dto/update-movie.dto';

@ApiTags('movies')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token' })
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ApiOperation({ summary: 'List movies (any authenticated user)' })
  @ApiOkResponse({ type: MoviePageResponseDto, description: 'Page of movies' })
  @ApiBadRequestResponse({ description: 'Invalid page or limit' })
  list(@Query() query: ListMoviesQuery): Promise<MoviePageResponseDto> {
    return this.moviesService.list(query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a movie by id (any authenticated user)' })
  @ApiOkResponse({ type: MovieResponseDto, description: 'The movie' })
  @ApiBadRequestResponse({ description: 'Malformed id' })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  get(@Param('id', ParseObjectIdPipe) id: string): Promise<MovieResponseDto> {
    return this.moviesService.get(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a movie (admin only)' })
  @ApiCreatedResponse({ type: MovieResponseDto, description: 'Movie created' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  create(@Body() dto: CreateMovieDto): Promise<MovieResponseDto> {
    return this.moviesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update a movie (admin only)',
    description:
      'Editing a synced movie protects it from being overwritten by later syncs.',
  })
  @ApiOkResponse({ type: MovieResponseDto, description: 'Movie updated' })
  @ApiBadRequestResponse({ description: 'Validation failed or malformed id' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateMovieDto,
  ): Promise<MovieResponseDto> {
    return this.moviesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a movie (admin only)' })
  @ApiNoContentResponse({ description: 'Movie deleted' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.moviesService.remove(id);
  }
}

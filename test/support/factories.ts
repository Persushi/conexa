import type { User } from '../../src/auth/domain/user.entity';
import { Role } from '../../src/auth/domain/role.enum';
import type { Movie } from '../../src/movies/domain/movie.entity';
import type { SwapiFilm } from '../../src/swapi/domain/swapi.port';

export function buildMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: '65f1c2a4e4b0a1b2c3d4e5f6',
    isManual: true,
    swapiId: null,
    title: 'A New Hope',
    episodeId: 4,
    openingCrawl: 'It is a period of civil war...',
    director: 'George Lucas',
    producer: 'Gary Kurtz, Rick McCallum',
    releaseDate: '1977-05-25',
    characters: [],
    planets: [],
    starships: [],
    vehicles: [],
    species: [],
    url: null,
    swapiCreated: null,
    swapiEdited: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function buildFilm(overrides: Partial<SwapiFilm> = {}): SwapiFilm {
  return {
    uid: '1',
    title: 'A New Hope',
    episodeId: 4,
    openingCrawl: 'It is a period of civil war...',
    director: 'George Lucas',
    producer: 'Gary Kurtz, Rick McCallum',
    releaseDate: '1977-05-25',
    characters: ['https://www.swapi.tech/api/people/1'],
    planets: ['https://www.swapi.tech/api/planets/1'],
    starships: [],
    vehicles: [],
    species: [],
    url: 'https://www.swapi.tech/api/films/1',
    created: '2026-10-07T12:10:29.699Z',
    edited: '2026-10-07T12:10:29.699Z',
    ...overrides,
  };
}

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: '65f1c2a4e4b0a1b2c3d4e5aa',
    email: 'luke@rebels.org',
    password: 'hashed-password',
    role: Role.USER,
    ...overrides,
  };
}

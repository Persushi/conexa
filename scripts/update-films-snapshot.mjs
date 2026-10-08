// Regenerates src/movies/infrastructure/films.snapshot.ts from the live SWAPI.
// The snapshot only feeds the in-memory fallback used when MongoDB is unreachable.
import { writeFileSync } from 'node:fs';

const BASE = process.env.SWAPI_BASE_URL ?? 'https://www.swapi.tech/api';
const response = await fetch(`${BASE}/films`);
if (!response.ok) throw new Error(`SWAPI answered ${response.status}`);
const { result } = await response.json();

const films = result.map(({ uid, properties: p }) => ({
  isManual: false,
  swapiId: String(uid),
  title: p.title,
  episodeId: p.episode_id,
  openingCrawl: p.opening_crawl,
  director: p.director,
  producer: p.producer,
  releaseDate: p.release_date,
  characters: p.characters,
  planets: p.planets,
  starships: p.starships,
  vehicles: p.vehicles,
  species: p.species,
  url: p.url,
  swapiCreated: p.created,
  swapiEdited: p.edited,
}));

const out = `import type { NewMovie } from '../domain/movie.repository.port';

/**
 * Snapshot of ${BASE}/films taken on ${new Date().toISOString().slice(0, 10)}.
 * Only used to pre-load the in-memory fallback when MongoDB is unreachable.
 * Regenerate with \`npm run snapshot:update\`.
 */
export const FILMS_SNAPSHOT: NewMovie[] = ${JSON.stringify(films, null, 2)};
`;
writeFileSync(new URL('../src/movies/infrastructure/films.snapshot.ts', import.meta.url), out);
console.log(`Wrote ${films.length} films`);

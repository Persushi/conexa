export interface SwapiFilm {
  uid: string;
  title: string;
  episodeId: number;
  openingCrawl: string;
  director: string;
  producer: string;
  releaseDate: string;
  characters: string[];
  planets: string[];
  starships: string[];
  vehicles: string[];
  species: string[];
  url: string;
  created: string;
  edited: string;
}

export interface SwapiPort {
  /** Throws UpstreamError when SWAPI is unreachable or answers with an unexpected payload. */
  fetchFilms(): Promise<SwapiFilm[]>;
}

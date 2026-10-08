/** Every film property exposed by SWAPI, plus the ones an admin can edit. */
export interface MovieFields {
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
  url: string | null;
}

export interface Movie extends MovieFields {
  id: string;
  /** True when an admin created the movie by hand; false when it came from the SWAPI sync. */
  isManual: boolean;
  /** SWAPI `uid`; the natural key the sync upserts on. Null for manual movies. */
  swapiId: string | null;
  swapiCreated: string | null;
  swapiEdited: string | null;
  createdAt: Date;
  updatedAt: Date;
}

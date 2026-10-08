import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstreamError } from '../../common/errors/domain.errors';
import type { EnvConfig } from '../../config/env.validation';
import type { SwapiFilm, SwapiPort } from '../domain/swapi.port';

const REQUEST_TIMEOUT_MS = 10_000;
const RETRYABLE_STATUSES = new Set([408, 429]);

/** Worth retrying: network failures, timeouts, 408, 429 and 5xx. */
class TransientUpstreamError extends UpstreamError {}

interface RawFilmItem {
  uid?: string;
  properties?: Record<string, unknown>;
}

@Injectable()
export class SwapiAdapter implements SwapiPort {
  private readonly logger = new Logger(SwapiAdapter.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  /**
   * Retries transient failures with exponential backoff
   * (SWAPI_RETRY_DELAY_MS, then x2, x4…). Permanent failures (4xx, HTML or
   * malformed payloads) fail immediately: retrying them would not help.
   */
  async fetchFilms(): Promise<SwapiFilm[]> {
    const attempts = this.config.get('SWAPI_RETRY_ATTEMPTS', { infer: true });
    const baseDelay = this.config.get('SWAPI_RETRY_DELAY_MS', { infer: true });

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.fetchOnce();
      } catch (error) {
        if (!(error instanceof TransientUpstreamError)) throw error;
        if (attempt >= attempts) {
          throw new UpstreamError(
            `${error.message} (gave up after ${attempts} attempts)`,
          );
        }

        const wait = baseDelay * 2 ** (attempt - 1);
        this.logger.warn(
          `SWAPI attempt ${attempt}/${attempts} failed (${error.message}); retrying in ${wait}ms`,
        );
        await sleep(wait);
      }
    }
  }

  private async fetchOnce(): Promise<SwapiFilm[]> {
    const url = `${this.config.get('SWAPI_BASE_URL', { infer: true })}/films`;

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new TransientUpstreamError('Could not reach SWAPI');
    }
    if (!response.ok) {
      const message = `SWAPI responded with status ${response.status}`;
      throw response.status >= 500 || RETRYABLE_STATUSES.has(response.status)
        ? new TransientUpstreamError(message)
        : new UpstreamError(message);
    }

    let body: { result?: RawFilmItem[] };
    try {
      body = (await response.json()) as { result?: RawFilmItem[] };
    } catch {
      // SWAPI answers 200 with an HTML page for unknown routes.
      throw new UpstreamError('SWAPI returned an invalid JSON body');
    }
    if (!Array.isArray(body.result)) {
      throw new UpstreamError('SWAPI returned an unexpected payload');
    }

    return body.result.map((item) => this.toFilm(item));
  }

  private toFilm(item: RawFilmItem): SwapiFilm {
    const p = item.properties;
    if (
      !item.uid ||
      !p ||
      typeof p.title !== 'string' ||
      typeof p.episode_id !== 'number'
    ) {
      throw new UpstreamError('SWAPI returned a film with missing fields');
    }

    return {
      uid: String(item.uid),
      title: p.title,
      episodeId: p.episode_id,
      openingCrawl: asString(p.opening_crawl),
      director: asString(p.director),
      producer: asString(p.producer),
      releaseDate: asString(p.release_date),
      characters: asStringArray(p.characters),
      planets: asStringArray(p.planets),
      starships: asStringArray(p.starships),
      vehicles: asStringArray(p.vehicles),
      species: asStringArray(p.species),
      url: asString(p.url),
      created: asString(p.created),
      edited: asString(p.edited),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}

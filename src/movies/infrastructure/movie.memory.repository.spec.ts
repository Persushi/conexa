import { ConflictError } from '../../common/errors/domain.errors';
import { buildFilm } from '../../../test/support/factories';
import type { NewMovie } from '../domain/movie.repository.port';
import { FILMS_SNAPSHOT } from './films.snapshot';
import { MovieMemoryRepository } from './movie.memory.repository';

const movie = (overrides: Partial<NewMovie> = {}): NewMovie => ({
  isManual: true,
  title: 'Fan Film',
  episodeId: 10,
  openingCrawl: '...',
  director: 'Me',
  producer: 'Me',
  releaseDate: '2026-01-01',
  characters: [],
  planets: [],
  starships: [],
  vehicles: [],
  species: [],
  url: null,
  ...overrides,
});

describe('MovieMemoryRepository', () => {
  let repo: MovieMemoryRepository;

  beforeEach(() => {
    repo = new MovieMemoryRepository();
  });

  it('creates movies with an ObjectId-shaped id and null swapi fields for manual ones', async () => {
    const created = await repo.create(movie());

    expect(created.id).toMatch(/^[a-f\d]{24}$/);
    expect(created).toMatchObject({
      swapiId: null,
      swapiCreated: null,
      isManual: true,
    });
    await expect(repo.findById(created.id)).resolves.toEqual(created);
  });

  it('rejects a second movie with the same swapiId, like the unique index does', async () => {
    await repo.create(movie({ isManual: false, swapiId: '1' }));

    await expect(
      repo.create(movie({ isManual: false, swapiId: '1' })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('lists ordered by release date and paginates with the real total', async () => {
    await repo.create(movie({ title: 'C', releaseDate: '2003-01-01' }));
    await repo.create(movie({ title: 'A', releaseDate: '1977-01-01' }));
    await repo.create(movie({ title: 'B', releaseDate: '1980-01-01' }));

    const page = await repo.list(1, 1);

    expect(page.total).toBe(3);
    expect(page.items.map((m) => m.title)).toEqual(['B']);
  });

  it('updates only the defined fields and bumps updatedAt', async () => {
    const created = await repo.create(movie());

    const updated = await repo.update(created.id, {
      title: 'Renamed',
      director: undefined,
    });

    expect(updated).toMatchObject({ title: 'Renamed', director: 'Me' });
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created.updatedAt.getTime(),
    );
    await expect(repo.update('missing', { title: 'x' })).resolves.toBeNull();
  });

  it('does not leak internal state: mutating a result does not change the store', async () => {
    const created = await repo.create(movie({ characters: ['a'] }));

    created.characters.push('mutated');
    created.title = 'mutated';

    await expect(repo.findById(created.id)).resolves.toMatchObject({
      title: 'Fan Film',
      characters: ['a'],
    });
  });

  it('finds movies by swapiId and deletes them', async () => {
    const synced = await repo.create(movie({ isManual: false, swapiId: '7' }));
    await repo.create(movie());

    await expect(repo.findBySwapiIds(['7', '8'])).resolves.toEqual([synced]);
    await expect(repo.delete(synced.id)).resolves.toBe(true);
    await expect(repo.delete(synced.id)).resolves.toBe(false);
  });

  describe('bundled snapshot', () => {
    it('contains the six SWAPI films, all non-manual with unique swapiIds', async () => {
      const seeded = new MovieMemoryRepository(FILMS_SNAPSHOT);

      const { items, total } = await seeded.list(0, 100);

      expect(total).toBe(6);
      expect(new Set(items.map((m) => m.swapiId)).size).toBe(6);
      expect(
        items.every(
          (m) => !m.isManual && m.title && m.openingCrawl && m.releaseDate,
        ),
      ).toBe(true);
    });

    it('is in the same shape the sync produces, so a later sync updates instead of duplicating', async () => {
      const seeded = new MovieMemoryRepository(FILMS_SNAPSHOT);

      const found = await seeded.findBySwapiIds([buildFilm({ uid: '1' }).uid]);

      expect(found).toHaveLength(1);
      expect(found[0].title).toBe('A New Hope');
    });
  });
});

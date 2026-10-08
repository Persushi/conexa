import { buildFilm, buildMovie } from '../../../test/support/factories';
import {
  ConflictError,
  UpstreamError,
} from '../../common/errors/domain.errors';
import { SyncMoviesService } from './sync-movies.service';

describe('SyncMoviesService', () => {
  const swapi = { fetchFilms: jest.fn() };
  const repo = {
    create: jest.fn(),
    findById: jest.fn(),
    findBySwapiIds: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  let service: SyncMoviesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SyncMoviesService(swapi, repo);
  });

  it('creates films that do not exist yet as non-manual movies, keeping every SWAPI field', async () => {
    swapi.fetchFilms.mockResolvedValue([
      buildFilm({ uid: '1' }),
      buildFilm({ uid: '2' }),
    ]);
    repo.findBySwapiIds.mockResolvedValue([]);

    const result = await service.run();

    expect(result).toEqual({ total: 2, created: 2, updated: 0 });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isManual: false,
        swapiId: '1',
        openingCrawl: 'It is a period of civil war...',
        characters: ['https://www.swapi.tech/api/people/1'],
        swapiEdited: '2026-10-07T12:10:29.699Z',
      }),
    );
  });

  it('looks films up by swapiId only, so movies created by hand are never touched', async () => {
    swapi.fetchFilms.mockResolvedValue([buildFilm({ uid: '1' })]);
    repo.findBySwapiIds.mockResolvedValue([]);

    await service.run();

    expect(repo.findBySwapiIds).toHaveBeenCalledWith(['1']);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('overwrites existing films with the upstream values, discarding manual edits', async () => {
    swapi.fetchFilms.mockResolvedValue([
      buildFilm({ uid: '1', title: 'Upstream title' }),
    ]);
    repo.findBySwapiIds.mockResolvedValue([
      buildMovie({
        id: 'abc',
        isManual: false,
        swapiId: '1',
        title: 'Edited by an admin',
      }),
    ]);

    const result = await service.run();

    expect(result).toEqual({ total: 1, created: 0, updated: 1 });
    expect(repo.update).toHaveBeenCalledWith(
      'abc',
      expect.objectContaining({ title: 'Upstream title' }),
    );
    // identity fields are never rewritten
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('swapiId');
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('isManual');
  });

  it('writes nothing when SWAPI fails', async () => {
    swapi.fetchFilms.mockRejectedValue(new UpstreamError('down'));

    await expect(service.run()).rejects.toBeInstanceOf(UpstreamError);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('refuses to start while another run is in progress, then recovers', async () => {
    let release!: (films: unknown[]) => void;
    swapi.fetchFilms.mockReturnValueOnce(
      new Promise((resolve) => (release = resolve)),
    );
    repo.findBySwapiIds.mockResolvedValue([]);

    const first = service.run();
    await expect(service.run()).rejects.toBeInstanceOf(ConflictError);

    release([]);
    await first;

    swapi.fetchFilms.mockResolvedValue([]);
    await expect(service.run()).resolves.toMatchObject({ total: 0 });
  });

  it('releases the lock even when the run fails', async () => {
    swapi.fetchFilms.mockRejectedValueOnce(new UpstreamError('down'));
    await expect(service.run()).rejects.toBeInstanceOf(UpstreamError);

    swapi.fetchFilms.mockResolvedValue([]);
    repo.findBySwapiIds.mockResolvedValue([]);
    await expect(service.run()).resolves.toMatchObject({ total: 0 });
  });
});

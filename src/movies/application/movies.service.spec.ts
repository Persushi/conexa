import { buildMovie } from '../../../test/support/factories';
import { NotFoundError } from '../../common/errors/domain.errors';
import { MoviesService } from './movies.service';

describe('MoviesService', () => {
  const repo = {
    create: jest.fn(),
    findById: jest.fn(),
    findBySwapiIds: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  let service: MoviesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new MoviesService(repo);
  });

  it('translates page/limit into skip/limit and echoes the paging back', async () => {
    repo.list.mockResolvedValue({ items: [buildMovie()], total: 41 });

    const page = await service.list(3, 20);

    expect(repo.list).toHaveBeenCalledWith(40, 20);
    expect(page).toMatchObject({ total: 41, page: 3, limit: 20 });
  });

  it('throws NotFoundError when the movie does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('flags movies created by hand and defaults the optional fields', async () => {
    repo.create.mockImplementation((data) => Promise.resolve(buildMovie(data)));

    await service.create({
      title: 'Custom',
      episodeId: 10,
      openingCrawl: '...',
      director: 'Me',
      producer: 'Me',
      releaseDate: '2026-01-01',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isManual: true,
        characters: [],
        species: [],
        url: null,
      }),
    );
    expect(repo.create.mock.calls[0][0]).not.toHaveProperty('swapiId');
  });

  describe('update', () => {
    it('passes the changes straight through', async () => {
      repo.update.mockResolvedValue(buildMovie());

      await service.update('id', { title: 'Edited' });

      expect(repo.update).toHaveBeenCalledWith('id', { title: 'Edited' });
    });

    it('throws NotFoundError for a missing movie', async () => {
      repo.update.mockResolvedValue(null);

      await expect(service.update('id', { title: 'x' })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  it('remove throws NotFoundError when nothing was deleted', async () => {
    repo.delete.mockResolvedValue(false);

    await expect(service.remove('id')).rejects.toBeInstanceOf(NotFoundError);
  });
});

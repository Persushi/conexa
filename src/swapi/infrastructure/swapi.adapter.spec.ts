import { UpstreamError } from '../../common/errors/domain.errors';
import { SwapiAdapter } from './swapi.adapter';

const filmItem = {
  uid: '1',
  properties: {
    title: 'A New Hope',
    episode_id: 4,
    opening_crawl: 'crawl',
    director: 'George Lucas',
    producer: 'Gary Kurtz',
    release_date: '1977-05-25',
    characters: ['c1'],
    planets: ['p1'],
    starships: [],
    vehicles: [],
    species: [],
    url: 'https://swapi.test/api/films/1',
    created: 'c',
    edited: 'e',
  },
};

describe('SwapiAdapter', () => {
  const settings: Record<string, unknown> = {
    SWAPI_BASE_URL: 'https://swapi.test/api',
    SWAPI_RETRY_ATTEMPTS: 3,
    SWAPI_RETRY_DELAY_MS: 0,
  };
  const config = { get: jest.fn((key: string) => settings[key]) };
  const adapter = new SwapiAdapter(config as never);
  const fetchMock = jest.spyOn(global, 'fetch');

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

  afterEach(() => fetchMock.mockReset());
  afterAll(() => fetchMock.mockRestore());

  it('maps SWAPI properties to the film shape', async () => {
    fetchMock.mockResolvedValue(json({ result: [filmItem] }));

    const [film] = await adapter.fetchFilms();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://swapi.test/api/films',
      expect.anything(),
    );
    expect(film).toEqual({
      uid: '1',
      title: 'A New Hope',
      episodeId: 4,
      openingCrawl: 'crawl',
      director: 'George Lucas',
      producer: 'Gary Kurtz',
      releaseDate: '1977-05-25',
      characters: ['c1'],
      planets: ['p1'],
      starships: [],
      vehicles: [],
      species: [],
      url: 'https://swapi.test/api/films/1',
      created: 'c',
      edited: 'e',
    });
  });

  describe('retries', () => {
    it('recovers from transient failures: network error, then 503, then success', async () => {
      fetchMock
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce(json({}, 503))
        .mockResolvedValueOnce(json({ result: [filmItem] }));

      await expect(adapter.fetchFilms()).resolves.toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('retries 429 responses', async () => {
      fetchMock
        .mockResolvedValueOnce(json({}, 429))
        .mockResolvedValueOnce(json({ result: [filmItem] }));

      await expect(adapter.fetchFilms()).resolves.toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('gives up after the configured attempts and reports an UpstreamError', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      await expect(adapter.fetchFilms()).rejects.toThrow(
        new UpstreamError('Could not reach SWAPI (gave up after 3 attempts)'),
      );
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('waits with exponential backoff between attempts', async () => {
      const spy = jest.spyOn(global, 'setTimeout');
      settings.SWAPI_RETRY_DELAY_MS = 10;
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      await adapter.fetchFilms().catch(() => undefined);

      const delays = spy.mock.calls
        .map(([, ms]) => ms)
        .filter((ms) => ms === 10 || ms === 20);
      expect(delays).toEqual([10, 20]);
      settings.SWAPI_RETRY_DELAY_MS = 0;
      spy.mockRestore();
    });

    it.each([
      ['a 404 answer', () => json({}, 404), 'status 404'],
      [
        'an HTML page served with 200',
        () => new Response('<!DOCTYPE html>'),
        'invalid JSON',
      ],
      [
        'a payload without result',
        () => json({ message: 'ok' }),
        'unexpected payload',
      ],
      [
        'a film missing required fields',
        () =>
          json({ result: [{ uid: '1', properties: { title: 'No episode' } }] }),
        'missing fields',
      ],
    ])('does not retry %s', async (_name, response, message) => {
      fetchMock.mockImplementation(() => Promise.resolve(response()));

      await expect(adapter.fetchFilms()).rejects.toThrow(message);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});

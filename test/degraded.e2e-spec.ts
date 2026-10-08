import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { buildFilm } from './support/factories';

// AppModule validates the environment as soon as it is imported, so the
// variables below must be set before it is loaded (hence `require` in beforeAll).
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/starwars'; // nothing listens on port 1
process.env.MONGODB_CONNECT_TIMEOUT_MS = '300';
process.env.DB_FALLBACK_ENABLED = 'true';

describe('MongoDB unreachable: degraded start (e2e)', () => {
  let app: INestApplication;
  const swapi = { fetchFilms: jest.fn() };
  let adminToken: string;
  let userToken: string;

  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (email: string, role?: string) =>
    (
      await http()
        .post('/auth/register')
        .send({ email, password: 'Str0ng!Pass', role })
        .expect(201)
    ).body.access_token as string;

  beforeAll(async () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { AppModule } = require('../src/app.module');
    const { configureApp } = require('../src/app.setup');
    const { SWAPI_PORT } = require('../src/injection-tokens');
    /* eslint-enable @typescript-eslint/no-require-imports */

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SWAPI_PORT)
      .useValue(swapi)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    adminToken = await signUp('boss@empire.org', 'admin');
    userToken = await signUp('luke@rebels.org');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('starts, and says so on the health endpoint', async () => {
    const { body } = await http().get('/health').expect(200);

    expect(body).toMatchObject({ status: 'degraded', database: 'memory' });
  });

  it('lists the API own data: the bundled SWAPI films, in release order', async () => {
    const { body } = await http()
      .get('/movies')
      .set(bearer(userToken))
      .expect(200);

    expect(body.total).toBe(6);
    expect(body.items.map((m: { title: string }) => m.title)).toEqual([
      'A New Hope',
      'The Empire Strikes Back',
      'Return of the Jedi',
      'The Phantom Menace',
      'Attack of the Clones',
      'Revenge of the Sith',
    ]);
    expect(body.items[0]).toMatchObject({
      isManual: false,
      swapiId: '1',
      director: 'George Lucas',
    });
    expect(body.items[0].openingCrawl).toContain('civil war');
  });

  it('paginates and serves the detail of a bundled movie', async () => {
    const { body: page } = await http()
      .get('/movies?page=2&limit=4')
      .set(bearer(userToken))
      .expect(200);
    expect(page).toMatchObject({ total: 6, page: 2, limit: 4 });
    expect(page.items).toHaveLength(2);

    await http()
      .get(`/movies/${page.items[0].id}`)
      .set(bearer(userToken))
      .expect(200);
  });

  it('keeps authentication and roles working on the in-memory users', async () => {
    await http().get('/movies').expect(401);
    await http()
      .post('/movies')
      .set(bearer(userToken))
      .send({ title: 'x' })
      .expect(403);
    await http()
      .post('/auth/login')
      .send({ email: 'luke@rebels.org', password: 'Str0ng!Pass' })
      .expect(200);
    await http()
      .post('/auth/register')
      .send({ email: 'LUKE@rebels.org', password: 'Str0ng!Pass' })
      .expect(409);
  });

  it('lets admins write (volatile), and the sync updates the bundled films instead of duplicating them', async () => {
    await http()
      .post('/movies')
      .set(bearer(adminToken))
      .send({
        title: 'Fan Film',
        episodeId: 10,
        openingCrawl: '...',
        director: 'Me',
        producer: 'Me',
        releaseDate: '2026-01-01',
      })
      .expect(201);

    swapi.fetchFilms.mockResolvedValue(
      [1, 2, 3, 4, 5, 6, 7].map((n) =>
        buildFilm({
          uid: String(n),
          title: `Film ${n}`,
          releaseDate: `2000-01-0${n}`,
        }),
      ),
    );
    const { body } = await http()
      .post('/movies/sync')
      .set(bearer(adminToken))
      .expect(200);

    expect(body).toEqual({ total: 7, created: 1, updated: 6 });
    const { body: list } = await http().get('/movies').set(bearer(userToken));
    expect(list.total).toBe(8); // 6 bundled + 1 new from SWAPI + 1 fan film
  });
});

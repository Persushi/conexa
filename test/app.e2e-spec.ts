import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AdminSeedService } from '../src/auth/application/admin-seed.service';
import { configureApp } from '../src/app.setup';
import { UpstreamError } from '../src/common/errors/domain.errors';
import { PERSISTENCE, SWAPI_PORT } from '../src/injection-tokens';
import type { Persistence } from '../src/persistence/persistence';
import { buildFilm } from './support/factories';

const ADMIN = { email: 'admin@empire.org', password: 'Adm1n!Password' };
const REGULAR = { email: 'luke@rebels.org', password: 'Str0ng!Pass' };

const newMovie = {
  title: 'Custom Movie',
  episodeId: 10,
  openingCrawl: 'A long time ago...',
  director: 'Someone',
  producer: 'Someone Else',
  releaseDate: '2026-01-01',
};

describe('Star Wars API (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  const swapi = { fetchFilms: jest.fn() };

  let adminToken: string;
  let userToken: string;

  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = async (credentials: { email: string; password: string }) =>
    (await http().post('/auth/login').send(credentials).expect(200)).body
      .access_token as string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SWAPI_PORT)
      .useValue(swapi)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    connection = app.get<Persistence>(PERSISTENCE).connection as Connection;

    await app.get(AdminSeedService).run();
    await http().post('/auth/register').send(REGULAR).expect(201);
    adminToken = await login(ADMIN);
    userToken = await login(REGULAR);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    swapi.fetchFilms.mockReset();
    await connection.collection('movies').deleteMany({});
  });

  describe('health', () => {
    it('is public and reports MongoDB as the data store', async () => {
      const { body } = await http().get('/health').expect(200);
      expect(body).toMatchObject({ status: 'ok', database: 'mongo' });
      expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('auth', () => {
    it('registers a regular user and returns a token carrying the user role', async () => {
      const { body } = await http()
        .post('/auth/register')
        .send({ email: 'leia@rebels.org', password: 'Str0ng!Pass' })
        .expect(201);

      const payload = JSON.parse(
        Buffer.from(body.access_token.split('.')[1], 'base64url').toString(),
      );
      expect(payload).toMatchObject({ email: 'leia@rebels.org', role: 'user' });
    });

    it('treats emails case-insensitively and rejects duplicates', async () => {
      await http()
        .post('/auth/register')
        .send({ ...REGULAR, email: 'LUKE@Rebels.org' })
        .expect(409);
    });

    // Documents a known, deliberate weakness. When self-assigned roles are
    // removed (see AuthService.register), flip this test to expect role "user".
    it('lets the client choose its role at sign-up (challenge-only)', async () => {
      const { body } = await http()
        .post('/auth/register')
        .send({
          email: 'boss@empire.org',
          password: 'Str0ng!Pass',
          role: 'admin',
        })
        .expect(201);

      const payload = JSON.parse(
        Buffer.from(body.access_token.split('.')[1], 'base64url').toString(),
      );
      expect(payload.role).toBe('admin');
    });

    it('rejects a role that does not exist', () =>
      http()
        .post('/auth/register')
        .send({
          email: 'odd@empire.org',
          password: 'Str0ng!Pass',
          role: 'emperor',
        })
        .expect(400));

    it('rejects weak passwords and malformed emails', async () => {
      await http()
        .post('/auth/register')
        .send({ email: 'x@y.org', password: 'weak' })
        .expect(400);
      await http()
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'Str0ng!Pass' })
        .expect(400);
    });

    it('logs in with valid credentials and rejects invalid ones', async () => {
      await http()
        .post('/auth/login')
        .send({ ...REGULAR, password: 'Wrong!Pass1' })
        .expect(401);
      await http()
        .post('/auth/login')
        .send({ email: 'ghost@rebels.org', password: 'x' })
        .expect(401);
      expect(await login(REGULAR)).toEqual(expect.any(String));
    });

    it('the seeded admin logs in with the admin role', () => {
      const payload = JSON.parse(
        Buffer.from(adminToken.split('.')[1], 'base64url').toString(),
      );
      expect(payload.role).toBe('admin');
    });

    it('seeding twice is a no-op', async () => {
      await expect(app.get(AdminSeedService).run()).resolves.toBe('exists');
    });
  });

  describe('authentication on movies', () => {
    it.each([
      ['GET', '/movies'],
      ['GET', '/movies/65f1c2a4e4b0a1b2c3d4e5f6'],
      ['POST', '/movies'],
      ['PATCH', '/movies/65f1c2a4e4b0a1b2c3d4e5f6'],
      ['DELETE', '/movies/65f1c2a4e4b0a1b2c3d4e5f6'],
      ['POST', '/movies/sync'],
    ])('%s %s requires a token', async (method, path) => {
      await http()[method.toLowerCase() as 'get'](path).expect(401);
    });

    it('rejects a token signed with another secret', async () => {
      const forged =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhQGIuYyIsInJvbGUiOiJhZG1pbiJ9.' +
        'x'.repeat(43);
      await http().get('/movies').set(bearer(forged)).expect(401);
    });
  });

  describe('authorization by role', () => {
    it('lets regular users read but not write', async () => {
      const { body: created } = await http()
        .post('/movies')
        .set(bearer(adminToken))
        .send(newMovie)
        .expect(201);

      await http().get('/movies').set(bearer(userToken)).expect(200);
      await http()
        .get(`/movies/${created.id}`)
        .set(bearer(userToken))
        .expect(200);

      await http()
        .post('/movies')
        .set(bearer(userToken))
        .send(newMovie)
        .expect(403);
      await http()
        .patch(`/movies/${created.id}`)
        .set(bearer(userToken))
        .send({ title: 'Hacked' })
        .expect(403);
      await http()
        .delete(`/movies/${created.id}`)
        .set(bearer(userToken))
        .expect(403);
      await http().post('/movies/sync').set(bearer(userToken)).expect(403);

      const { body: unchanged } = await http()
        .get(`/movies/${created.id}`)
        .set(bearer(adminToken))
        .expect(200);
      expect(unchanged.title).toBe('Custom Movie');
    });

    it('lets admins read the detail too', async () => {
      const { body } = await http()
        .post('/movies')
        .set(bearer(adminToken))
        .send(newMovie);

      await http()
        .get(`/movies/${body.id}`)
        .set(bearer(adminToken))
        .expect(200);
    });
  });

  describe('movies CRUD (admin)', () => {
    it('creates, reads, updates and deletes a movie', async () => {
      const { body: created } = await http()
        .post('/movies')
        .set(bearer(adminToken))
        .send({
          ...newMovie,
          characters: ['https://www.swapi.tech/api/people/1'],
        })
        .expect(201);
      expect(created).toMatchObject({
        title: 'Custom Movie',
        isManual: true,
        swapiId: null,
        characters: ['https://www.swapi.tech/api/people/1'],
        planets: [],
      });

      const { body: updated } = await http()
        .patch(`/movies/${created.id}`)
        .set(bearer(adminToken))
        .send({ title: 'Renamed', director: 'New Director' })
        .expect(200);
      expect(updated).toMatchObject({
        title: 'Renamed',
        director: 'New Director',
        episodeId: 10,
      });

      await http()
        .delete(`/movies/${created.id}`)
        .set(bearer(adminToken))
        .expect(204);
      await http()
        .get(`/movies/${created.id}`)
        .set(bearer(adminToken))
        .expect(404);
      await http()
        .delete(`/movies/${created.id}`)
        .set(bearer(adminToken))
        .expect(404);
    });

    it('validates the body', async () => {
      await http()
        .post('/movies')
        .set(bearer(adminToken))
        .send({ ...newMovie, releaseDate: '25/05/1977' })
        .expect(400);
      await http()
        .post('/movies')
        .set(bearer(adminToken))
        .send({ title: 'Incomplete' })
        .expect(400);
      await http()
        .post('/movies')
        .set(bearer(adminToken))
        .send({ ...newMovie, unknownField: true })
        .expect(400);
    });

    it('answers 400 for malformed ids and 404 for unknown ones', async () => {
      await http().get('/movies/not-an-id').set(bearer(userToken)).expect(400);
      await http()
        .get('/movies/65f1c2a4e4b0a1b2c3d4e5f6')
        .set(bearer(userToken))
        .expect(404);
    });

    it('paginates the list', async () => {
      for (const episodeId of [1, 2, 3]) {
        await http()
          .post('/movies')
          .set(bearer(adminToken))
          .send({
            ...newMovie,
            episodeId,
            releaseDate: `2026-01-0${episodeId}`,
          });
      }

      const { body } = await http()
        .get('/movies?page=2&limit=2')
        .set(bearer(userToken))
        .expect(200);

      expect(body).toMatchObject({ total: 3, page: 2, limit: 2 });
      expect(body.items).toHaveLength(1);
      await http().get('/movies?limit=1000').set(bearer(userToken)).expect(400);
    });
  });

  describe('SWAPI sync', () => {
    const films = [
      buildFilm({ uid: '1', title: 'A New Hope', releaseDate: '1977-05-25' }),
      buildFilm({
        uid: '2',
        title: 'The Empire Strikes Back',
        episodeId: 5,
        releaseDate: '1980-05-17',
      }),
    ];

    it('imports every film with all its fields, and is idempotent', async () => {
      swapi.fetchFilms.mockResolvedValue(films);

      const first = await http()
        .post('/movies/sync')
        .set(bearer(adminToken))
        .expect(200);
      expect(first.body).toEqual({
        total: 2,
        created: 2,
        updated: 0,
      });

      const second = await http()
        .post('/movies/sync')
        .set(bearer(adminToken))
        .expect(200);
      expect(second.body).toEqual({
        total: 2,
        created: 0,
        updated: 2,
      });

      const { body } = await http()
        .get('/movies')
        .set(bearer(userToken))
        .expect(200);
      expect(body.total).toBe(2);
      expect(body.items[0]).toMatchObject({
        isManual: false,
        swapiId: '1',
        title: 'A New Hope',
        episodeId: 4,
        director: 'George Lucas',
        openingCrawl: 'It is a period of civil war...',
        characters: ['https://www.swapi.tech/api/people/1'],
        url: 'https://www.swapi.tech/api/films/1',
      });
    });

    it('overwrites a synced movie that an admin edited by hand', async () => {
      swapi.fetchFilms.mockResolvedValue(films);
      await http().post('/movies/sync').set(bearer(adminToken)).expect(200);
      const { body: list } = await http()
        .get('/movies')
        .set(bearer(adminToken));
      const target = list.items.find(
        (m: { swapiId: string }) => m.swapiId === '1',
      );

      await http()
        .patch(`/movies/${target.id}`)
        .set(bearer(adminToken))
        .send({ title: 'My Custom Title' })
        .expect(200);

      const { body: result } = await http()
        .post('/movies/sync')
        .set(bearer(adminToken))
        .expect(200);
      expect(result).toEqual({ total: 2, created: 0, updated: 2 });

      const { body: after } = await http()
        .get(`/movies/${target.id}`)
        .set(bearer(userToken));
      expect(after.title).toBe('A New Hope');
    });

    it('never touches movies created by hand, and flags them as manual', async () => {
      const { body: manual } = await http()
        .post('/movies')
        .set(bearer(adminToken))
        .send({ ...newMovie, title: 'Fan Film', episodeId: 4 })
        .expect(201);
      expect(manual).toMatchObject({ isManual: true, swapiId: null });

      swapi.fetchFilms.mockResolvedValue(films);
      const { body: result } = await http()
        .post('/movies/sync')
        .set(bearer(adminToken))
        .expect(200);
      expect(result).toEqual({ total: 2, created: 2, updated: 0 });

      const { body: after } = await http()
        .get(`/movies/${manual.id}`)
        .set(bearer(userToken));
      expect(after).toMatchObject({ title: 'Fan Film', isManual: true });

      const { body: list } = await http().get('/movies').set(bearer(userToken));
      expect(list.total).toBe(3);
      expect(
        list.items.filter((m: { isManual: boolean }) => m.isManual),
      ).toHaveLength(1);
    });

    it('answers 502 and writes nothing when SWAPI is down', async () => {
      swapi.fetchFilms.mockRejectedValue(
        new UpstreamError('Could not reach SWAPI'),
      );

      await http().post('/movies/sync').set(bearer(adminToken)).expect(502);

      const { body } = await http().get('/movies').set(bearer(userToken));
      expect(body.total).toBe(0);
    });
  });
});

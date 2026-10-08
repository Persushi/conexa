import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const valid = {
    MONGODB_URI: 'mongodb://localhost:27017/starwars',
    JWT_SECRET: 'a-secret-with-enough-length',
  };

  it('applies defaults', () => {
    expect(validateEnv(valid)).toMatchObject({
      PORT: 3000,
      JWT_EXPIRES_IN: '1h',
      SYNC_CRON: '0 3 * * *',
      SYNC_CRON_ENABLED: true,
      SWAPI_RETRY_ATTEMPTS: 3,
      SWAPI_RETRY_DELAY_MS: 500,
      MONGODB_CONNECT_TIMEOUT_MS: 5000,
      DB_FALLBACK_ENABLED: true,
    });
  });

  it('requires JWT_SECRET instead of falling back to a default', () => {
    expect(() => validateEnv({ MONGODB_URI: valid.MONGODB_URI })).toThrow(
      'JWT_SECRET is required',
    );
  });

  it('rejects a short JWT_SECRET', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(
      'at least 16',
    );
  });

  it('requires MONGODB_URI', () => {
    expect(() => validateEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(
      'MONGODB_URI is required',
    );
  });

  it('requires admin credentials to come in pairs', () => {
    expect(() => validateEnv({ ...valid, ADMIN_EMAIL: 'a@b.c' })).toThrow(
      'provided together',
    );
  });

  it('can switch the scheduled sync off', () => {
    expect(
      validateEnv({ ...valid, SYNC_CRON_ENABLED: 'false' }).SYNC_CRON_ENABLED,
    ).toBe(false);
  });

  it('validates the SWAPI retry settings', () => {
    expect(() => validateEnv({ ...valid, SWAPI_RETRY_ATTEMPTS: '0' })).toThrow(
      'SWAPI_RETRY_ATTEMPTS must be an integer >= 1',
    );
    expect(() => validateEnv({ ...valid, SWAPI_RETRY_DELAY_MS: '-5' })).toThrow(
      'SWAPI_RETRY_DELAY_MS',
    );
    expect(
      validateEnv({ ...valid, SWAPI_RETRY_ATTEMPTS: '5' }).SWAPI_RETRY_ATTEMPTS,
    ).toBe(5);
  });

  it('lets the in-memory fallback be switched off', () => {
    expect(
      validateEnv({ ...valid, DB_FALLBACK_ENABLED: 'false' })
        .DB_FALLBACK_ENABLED,
    ).toBe(false);
  });

  it('rejects a connect timeout that is too small to be meaningful', () => {
    expect(() =>
      validateEnv({ ...valid, MONGODB_CONNECT_TIMEOUT_MS: '5' }),
    ).toThrow('MONGODB_CONNECT_TIMEOUT_MS');
  });
});

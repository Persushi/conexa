export interface EnvConfig {
  PORT: number;
  MONGODB_URI: string;
  MONGODB_CONNECT_TIMEOUT_MS: number;
  DB_FALLBACK_ENABLED: boolean;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  SWAPI_BASE_URL: string;
  SWAPI_RETRY_ATTEMPTS: number;
  SWAPI_RETRY_DELAY_MS: number;
  SYNC_CRON: string;
  SYNC_CRON_ENABLED: boolean;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
}

const MIN_JWT_SECRET_LENGTH = 16;

function integer(
  config: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
): number {
  const value = Number(config[key] ?? fallback);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${key} must be an integer >= ${min}`);
  }
  return value;
}

function required(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

/**
 * Fails fast at boot: there is deliberately no fallback for secrets, so a
 * missing JWT_SECRET can never silently turn into a known default.
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const jwtSecret = required(config, 'JWT_SECRET');
  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`,
    );
  }

  const adminEmail = config.ADMIN_EMAIL as string | undefined;
  const adminPassword = config.ADMIN_PASSWORD as string | undefined;
  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be provided together');
  }

  return {
    PORT: integer(config, 'PORT', 3000, 1),
    MONGODB_URI: required(config, 'MONGODB_URI'),
    MONGODB_CONNECT_TIMEOUT_MS: integer(
      config,
      'MONGODB_CONNECT_TIMEOUT_MS',
      5000,
      100,
    ),
    DB_FALLBACK_ENABLED:
      config.DB_FALLBACK_ENABLED !== false &&
      config.DB_FALLBACK_ENABLED !== 'false',
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: (config.JWT_EXPIRES_IN as string | undefined) ?? '1h',
    SWAPI_BASE_URL:
      (config.SWAPI_BASE_URL as string | undefined) ??
      'https://www.swapi.tech/api',
    SWAPI_RETRY_ATTEMPTS: integer(config, 'SWAPI_RETRY_ATTEMPTS', 3, 1),
    SWAPI_RETRY_DELAY_MS: integer(config, 'SWAPI_RETRY_DELAY_MS', 500, 0),
    SYNC_CRON: (config.SYNC_CRON as string | undefined) ?? '0 3 * * *',
    SYNC_CRON_ENABLED:
      config.SYNC_CRON_ENABLED !== false &&
      config.SYNC_CRON_ENABLED !== 'false',
    ADMIN_EMAIL: adminEmail?.toLowerCase().trim() || undefined,
    ADMIN_PASSWORD: adminPassword || undefined,
  };
}

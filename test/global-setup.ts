import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Runs before any test file is loaded. AppModule validates the environment
 * when it is imported, so the variables must already exist by then.
 */
export default async function globalSetup(): Promise<void> {
  const mongo = await MongoMemoryServer.create();
  (globalThis as { __MONGO__?: MongoMemoryServer }).__MONGO__ = mongo;

  process.env.MONGODB_URI = mongo.getUri('starwars-e2e');
  process.env.JWT_SECRET = 'e2e-secret-with-enough-length';
  process.env.ADMIN_EMAIL = 'admin@empire.org';
  process.env.ADMIN_PASSWORD = 'Adm1n!Password';
  process.env.SYNC_CRON_ENABLED = 'false';
}

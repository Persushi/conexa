import type { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalTeardown(): Promise<void> {
  await (globalThis as { __MONGO__?: MongoMemoryServer }).__MONGO__?.stop();
}

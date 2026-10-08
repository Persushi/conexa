import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AdminSeedService } from './auth/application/admin-seed.service';
import { PERSISTENCE } from './injection-tokens';
import type { Persistence } from './persistence/persistence';

/** One-off script: creates the first admin. See AdminSeedService. */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    if (app.get<Persistence>(PERSISTENCE).mode === 'memory') {
      throw new Error(
        'MongoDB is unreachable: seeding an in-memory store would be lost as soon as this script exits',
      );
    }
    const result = await app.get(AdminSeedService).run();
    console.log(
      result === 'created'
        ? 'Admin created.'
        : 'Admin already exists, nothing to do.',
    );
  } finally {
    await app.close();
  }
}

seed().catch((error: Error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
});

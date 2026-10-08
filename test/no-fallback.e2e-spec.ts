import { Test } from '@nestjs/testing';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/starwars'; // nothing listens on port 1
process.env.MONGODB_CONNECT_TIMEOUT_MS = '300';
process.env.DB_FALLBACK_ENABLED = 'false';

describe('MongoDB unreachable with DB_FALLBACK_ENABLED=false (e2e)', () => {
  it('refuses to boot instead of silently serving volatile data', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require('../src/app.module');

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile(),
    ).rejects.toThrow('DB_FALLBACK_ENABLED=false');
  });
});

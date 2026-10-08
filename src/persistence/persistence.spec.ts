import { connectOrFallback } from './persistence';

describe('connectOrFallback', () => {
  // Nothing listens on port 1, so the connection is refused straight away.
  const unreachable = 'mongodb://127.0.0.1:1/starwars';

  it('falls back to memory when MongoDB is unreachable and the fallback is enabled', async () => {
    const result = await connectOrFallback({
      uri: unreachable,
      timeoutMs: 300,
      fallbackEnabled: true,
    });

    expect(result).toEqual({ mode: 'memory', connection: null });
  });

  it('fails to boot when MongoDB is unreachable and the fallback is disabled', async () => {
    await expect(
      connectOrFallback({
        uri: unreachable,
        timeoutMs: 300,
        fallbackEnabled: false,
      }),
    ).rejects.toThrow('DB_FALLBACK_ENABLED=false');
  });
});

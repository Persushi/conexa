import { UpstreamError } from '../common/errors/domain.errors';
import { SyncScheduler } from './sync.scheduler';

describe('SyncScheduler', () => {
  const config = { get: jest.fn() };
  const registry = { addCronJob: jest.fn() };
  const syncService = { run: jest.fn() };
  let scheduler: SyncScheduler;

  const configure = (values: Record<string, unknown>) =>
    config.get.mockImplementation((key: string) => values[key]);

  beforeEach(() => {
    jest.resetAllMocks();
    scheduler = new SyncScheduler(
      config as never,
      registry as never,
      syncService as never,
    );
  });

  it('does not register a job when the scheduled sync is disabled', () => {
    configure({ SYNC_CRON_ENABLED: false, SYNC_CRON: '0 3 * * *' });

    scheduler.onModuleInit();

    expect(registry.addCronJob).not.toHaveBeenCalled();
  });

  it('registers and starts a job with the configured expression', () => {
    configure({ SYNC_CRON_ENABLED: true, SYNC_CRON: '*/30 * * * *' });

    scheduler.onModuleInit();

    expect(registry.addCronJob).toHaveBeenCalledTimes(1);
    const [name, job] = registry.addCronJob.mock.calls[0];
    expect(name).toBe('movies-sync');
    expect(job.isActive).toBe(true);
    job.stop();
  });

  it('runs the sync on every tick', async () => {
    syncService.run.mockResolvedValue({
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
    });

    await scheduler.tick();

    expect(syncService.run).toHaveBeenCalledTimes(1);
  });

  it('swallows sync failures so a bad run never crashes the process', async () => {
    syncService.run.mockRejectedValue(new UpstreamError('SWAPI down'));

    await expect(scheduler.tick()).resolves.toBeUndefined();
  });
});

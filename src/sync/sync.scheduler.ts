import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import type { EnvConfig } from '../config/env.validation';
import { SyncMoviesService } from './application/sync-movies.service';

const JOB_NAME = 'movies-sync';

/**
 * Registers the sync cron at runtime (instead of @Cron) so the expression
 * and the on/off switch come from the environment.
 */
@Injectable()
export class SyncScheduler implements OnModuleInit {
  private readonly logger = new Logger(SyncScheduler.name);

  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly registry: SchedulerRegistry,
    private readonly syncService: SyncMoviesService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('SYNC_CRON_ENABLED', { infer: true })) {
      this.logger.log('Scheduled sync disabled (SYNC_CRON_ENABLED=false)');
      return;
    }

    const expression = this.config.get('SYNC_CRON', { infer: true });
    const job = CronJob.from({
      cronTime: expression,
      onTick: () => this.tick(),
      start: false,
    });
    this.registry.addCronJob(JOB_NAME, job);
    job.start();
    this.logger.log(`Scheduled sync registered with cron "${expression}"`);
  }

  /** Never throws: a failed run must not take the process down. */
  async tick(): Promise<void> {
    try {
      await this.syncService.run();
    } catch (error) {
      this.logger.error(`Scheduled sync failed: ${(error as Error).message}`);
    }
  }
}

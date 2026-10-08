import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation';
import { PERSISTENCE } from '../injection-tokens';
import { connectOrFallback, type Persistence } from './persistence';

@Injectable()
class PersistenceLifecycle implements OnApplicationShutdown {
  constructor(@Inject(PERSISTENCE) private readonly persistence: Persistence) {}

  async onApplicationShutdown(): Promise<void> {
    await this.persistence.connection?.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PERSISTENCE,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<EnvConfig, true>,
      ): Promise<Persistence> =>
        connectOrFallback({
          uri: config.get('MONGODB_URI', { infer: true }),
          timeoutMs: config.get('MONGODB_CONNECT_TIMEOUT_MS', { infer: true }),
          fallbackEnabled: config.get('DB_FALLBACK_ENABLED', { infer: true }),
        }),
    },
    PersistenceLifecycle,
  ],
  exports: [PERSISTENCE],
})
export class PersistenceModule {}

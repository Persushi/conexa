import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import type { EnvConfig } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  configureApp(app);
  setupSwagger(app);

  const config = app.get<ConfigService<EnvConfig, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();

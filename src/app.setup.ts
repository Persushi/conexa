import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { APP_VERSION } from './version';

/** Shared by main.ts and the e2e suite so both run with the same pipeline. */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Star Wars Movies API')
    .setDescription(
      'Movie management backend fed by the SWAPI films catalogue. ' +
        'Register or log in to get a JWT, then use the "Authorize" button.',
    )
    .setVersion(APP_VERSION)
    .addBearerAuth()
    .build();

  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
}

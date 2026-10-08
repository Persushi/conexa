import { Module } from '@nestjs/common';
import { SWAPI_PORT } from '../injection-tokens';
import { SwapiAdapter } from './infrastructure/swapi.adapter';

@Module({
  providers: [{ provide: SWAPI_PORT, useClass: SwapiAdapter }],
  exports: [SWAPI_PORT],
})
export class SwapiModule {}

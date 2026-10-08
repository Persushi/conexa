import { Controller, Get, Inject } from '@nestjs/common';
import { ConnectionStates } from 'mongoose';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';
import { PERSISTENCE } from './injection-tokens';
import type { Persistence } from './persistence/persistence';
import { APP_VERSION } from './version';

class HealthResponseDto {
  @ApiProperty({
    enum: ['ok', 'degraded'],
    description: '"degraded" when data is not being persisted to MongoDB',
  })
  status: 'ok' | 'degraded';

  @ApiProperty({
    enum: ['mongo', 'mongo-disconnected', 'memory'],
    description:
      '"memory" means MongoDB was unreachable at boot: data is volatile',
  })
  database: 'mongo' | 'mongo-disconnected' | 'memory';

  @ApiProperty({ example: '1.0.0' })
  version: string;
}

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(PERSISTENCE) private readonly persistence: Persistence) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness probe and data-store status',
    description:
      'Always 200 while the process is up; read `status` to tell a degraded start apart.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    const { connection } = this.persistence;
    const database = !connection
      ? 'memory'
      : connection.readyState === ConnectionStates.connected
        ? 'mongo'
        : 'mongo-disconnected';

    return {
      status: database === 'mongo' ? 'ok' : 'degraded',
      database,
      version: APP_VERSION,
    };
  }
}

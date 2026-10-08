import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/domain/role.enum';
import { SyncMoviesService } from './application/sync-movies.service';

class SyncResultDto {
  @ApiProperty({ example: 6 }) total: number;
  @ApiProperty({ example: 6 }) created: number;
  @ApiProperty({
    example: 0,
    description: 'Synced movies overwritten with the SWAPI values',
  })
  updated: number;
}

@ApiTags('movies')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token' })
@Controller('movies/sync')
export class SyncController {
  constructor(private readonly syncService: SyncMoviesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync the film catalogue from SWAPI (admin only)',
    description:
      'Upserts every SWAPI film. Synced movies edited by hand are restored to the SWAPI values; movies created by hand are never touched. ' +
      'The same job also runs on a cron (see SYNC_CRON).',
  })
  @ApiOkResponse({ type: SyncResultDto, description: 'Sync finished' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiConflictResponse({ description: 'A sync is already running' })
  @ApiBadGatewayResponse({
    description: 'SWAPI is unavailable; nothing was written',
  })
  sync(): Promise<SyncResultDto> {
    return this.syncService.run();
  }
}

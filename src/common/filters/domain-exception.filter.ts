import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ConflictError,
  DomainError,
  InvalidCredentialsError,
  NotFoundError,
  UpstreamError,
} from '../errors/domain.errors';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);

    response.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    });
  }

  private statusFor(error: DomainError): HttpStatus {
    if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof ConflictError) return HttpStatus.CONFLICT;
    if (error instanceof InvalidCredentialsError)
      return HttpStatus.UNAUTHORIZED;
    if (error instanceof UpstreamError) return HttpStatus.BAD_GATEWAY;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

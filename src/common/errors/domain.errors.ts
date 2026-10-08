/**
 * Framework-agnostic errors raised from the application layer. The HTTP
 * mapping lives in DomainExceptionFilter, so use cases never import @nestjs/common.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {}
export class ConflictError extends DomainError {}
export class InvalidCredentialsError extends DomainError {}
export class UpstreamError extends DomainError {}

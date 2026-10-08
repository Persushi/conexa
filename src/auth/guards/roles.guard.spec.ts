import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../domain/role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  let guard: RolesGuard;

  const contextFor = (user?: { role: Role }): ExecutionContext =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows any authenticated user when the route declares no roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextFor({ role: Role.USER }))).toBe(true);
  });

  it('allows a user whose role is required', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(contextFor({ role: Role.ADMIN }))).toBe(true);
  });

  it('forbids a user whose role is not required', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(contextFor({ role: Role.USER }))).toThrow(
      ForbiddenException,
    );
  });

  it('forbids a restricted route when there is no user on the request', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      ForbiddenException,
    );
  });
});

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../domain/role.enum';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const jwtService = { verifyAsync: jest.fn() };
  const reflector = { getAllAndOverride: jest.fn() };
  let guard: JwtAuthGuard;

  const contextWith = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
    );
  });

  it('lets @Public routes through without looking at the token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(contextWith({ headers: {} }))).resolves.toBe(
      true,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a request without Authorization header', async () => {
    await expect(
      guard.canActivate(contextWith({ headers: {} })),
    ).rejects.toThrow('Missing authorization token');
  });

  it('rejects a non-Bearer scheme', async () => {
    const request = { headers: { authorization: 'Basic abc' } };

    await expect(
      guard.canActivate(contextWith(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid or expired token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const request = { headers: { authorization: 'Bearer bad' } };

    await expect(guard.canActivate(contextWith(request))).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  it('rejects a validly signed token whose role is not a known role', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: '1',
      email: 'a@b.c',
      role: 'superuser',
    });
    const request = { headers: { authorization: 'Bearer ok' } };

    await expect(guard.canActivate(contextWith(request))).rejects.toThrow(
      'Invalid token payload',
    );
  });

  it('attaches the payload to the request on a valid token', async () => {
    const payload = { sub: '1', email: 'a@b.c', role: Role.ADMIN };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer ok' },
    };

    await expect(guard.canActivate(contextWith(request))).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });
});

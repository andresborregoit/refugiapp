import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;
  let request: { user?: { id: string; email: string; roles: UserRole[] } };
  let context: ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
    request = {};
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  });

  it('allows access when no roles are declared', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the authenticated user has the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    request.user = { id: 'user-id', email: 'admin@example.com', roles: [UserRole.ADMIN] };

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when one of multiple required roles matches', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.VETERINARIAN]);
    request.user = { id: 'user-id', email: 'vet@example.com', roles: [UserRole.VETERINARIAN] };

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the authenticated user lacks the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    request.user = {
      id: 'user-id',
      email: 'manager@example.com',
      roles: [UserRole.SHELTER_MANAGER],
    };

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies access when no authenticated user exists', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('reads roles from the handler and class using reflector override order', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});

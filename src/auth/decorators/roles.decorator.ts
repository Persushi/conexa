import { SetMetadata } from '@nestjs/common';
import type { Role } from '../domain/role.enum';

export const ROLES_KEY = 'roles';
/** Restricts a route to the given roles. Routes without it are open to any authenticated user. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

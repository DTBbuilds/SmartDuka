import { SetMetadata } from '@nestjs/common';

export type Role = 'admin' | 'branch_admin' | 'branch_manager' | 'supervisor' | 'cashier' | 'super_admin';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

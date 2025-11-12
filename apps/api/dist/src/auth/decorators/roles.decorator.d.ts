export type Role = 'admin' | 'branch_admin' | 'branch_manager' | 'supervisor' | 'cashier' | 'super_admin';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: Role[]) => import("@nestjs/common").CustomDecorator<string>;

import { ConfigService } from '@nestjs/config';
export type JwtPayload = {
    sub: string;
    email: string;
    name?: string;
    role: 'admin' | 'cashier' | 'super_admin' | 'branch_admin' | 'branch_manager' | 'supervisor';
    shopId: string;
};
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(cfg: ConfigService);
    validate(payload: JwtPayload): Promise<JwtPayload>;
}
export {};

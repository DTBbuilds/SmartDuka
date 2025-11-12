import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class PinRateLimitGuard implements CanActivate {
    private attempts;
    private readonly MAX_ATTEMPTS;
    private readonly LOCKOUT_TIME;
    canActivate(context: ExecutionContext): Promise<boolean>;
}

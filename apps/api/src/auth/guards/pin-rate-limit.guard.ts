import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class PinRateLimitGuard implements CanActivate {
  private attempts = new Map<string, { count: number; timestamp: number }>();
  private readonly MAX_ATTEMPTS = 3;
  private readonly LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { pin, shopId } = request.body;

    if (!pin || !shopId) {
      return true; // Allow if missing parameters (will be caught by validation)
    }

    const key = `${shopId}:${pin}`;
    const now = Date.now();

    const attempt = this.attempts.get(key);

    if (attempt) {
      if (now - attempt.timestamp < this.LOCKOUT_TIME) {
        if (attempt.count >= this.MAX_ATTEMPTS) {
          throw new HttpException(
            'Too many failed attempts. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        attempt.count++;
      } else {
        // Reset after lockout period
        this.attempts.set(key, { count: 1, timestamp: now });
      }
    } else {
      this.attempts.set(key, { count: 1, timestamp: now });
    }

    return true;
  }
}

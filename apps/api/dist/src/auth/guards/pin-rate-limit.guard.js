"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinRateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
let PinRateLimitGuard = class PinRateLimitGuard {
    attempts = new Map();
    MAX_ATTEMPTS = 3;
    LOCKOUT_TIME = 15 * 60 * 1000;
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const { pin, shopId } = request.body;
        if (!pin || !shopId) {
            return true;
        }
        const key = `${shopId}:${pin}`;
        const now = Date.now();
        const attempt = this.attempts.get(key);
        if (attempt) {
            if (now - attempt.timestamp < this.LOCKOUT_TIME) {
                if (attempt.count >= this.MAX_ATTEMPTS) {
                    throw new common_1.HttpException('Too many failed attempts. Please try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
                }
                attempt.count++;
            }
            else {
                this.attempts.set(key, { count: 1, timestamp: now });
            }
        }
        else {
            this.attempts.set(key, { count: 1, timestamp: now });
        }
        return true;
    }
};
exports.PinRateLimitGuard = PinRateLimitGuard;
exports.PinRateLimitGuard = PinRateLimitGuard = __decorate([
    (0, common_1.Injectable)()
], PinRateLimitGuard);
//# sourceMappingURL=pin-rate-limit.guard.js.map
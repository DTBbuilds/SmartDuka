"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
let CacheService = CacheService_1 = class CacheService {
    logger = new common_1.Logger(CacheService_1.name);
    cache = new Map();
    set(key, value, ttlSeconds = 300) {
        try {
            const expiresAt = Date.now() + ttlSeconds * 1000;
            this.cache.set(key, { value, expiresAt });
            this.logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
        }
        catch (error) {
            this.logger.error(`Cache SET failed for ${key}`, error?.message);
        }
    }
    get(key) {
        try {
            const entry = this.cache.get(key);
            if (!entry)
                return null;
            if (Date.now() > entry.expiresAt) {
                this.cache.delete(key);
                return null;
            }
            this.logger.debug(`Cache HIT: ${key}`);
            return entry.value;
        }
        catch (error) {
            this.logger.error(`Cache GET failed for ${key}`, error?.message);
            return null;
        }
    }
    delete(key) {
        try {
            const deleted = this.cache.delete(key);
            if (deleted) {
                this.logger.debug(`Cache DELETE: ${key}`);
            }
            return deleted;
        }
        catch (error) {
            this.logger.error(`Cache DELETE failed for ${key}`, error?.message);
            return false;
        }
    }
    clear() {
        try {
            const size = this.cache.size;
            this.cache.clear();
            this.logger.debug(`Cache CLEAR: ${size} entries removed`);
        }
        catch (error) {
            this.logger.error('Cache CLEAR failed', error?.message);
        }
    }
    getStats() {
        const entries = [];
        for (const [key, entry] of this.cache.entries()) {
            const expiresIn = Math.max(0, entry.expiresAt - Date.now());
            entries.push({ key, expiresIn });
        }
        return { size: this.cache.size, entries };
    }
    cleanup() {
        try {
            let removed = 0;
            const now = Date.now();
            for (const [key, entry] of this.cache.entries()) {
                if (now > entry.expiresAt) {
                    this.cache.delete(key);
                    removed++;
                }
            }
            if (removed > 0) {
                this.logger.debug(`Cache CLEANUP: ${removed} expired entries removed`);
            }
            return removed;
        }
        catch (error) {
            this.logger.error('Cache CLEANUP failed', error?.message);
            return 0;
        }
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)()
], CacheService);
//# sourceMappingURL=cache.service.js.map
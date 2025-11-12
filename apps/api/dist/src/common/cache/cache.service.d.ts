export declare class CacheService {
    private readonly logger;
    private cache;
    set<T>(key: string, value: T, ttlSeconds?: number): void;
    get<T>(key: string): T | null;
    delete(key: string): boolean;
    clear(): void;
    getStats(): {
        size: number;
        entries: Array<{
            key: string;
            expiresIn: number;
        }>;
    };
    cleanup(): number;
}

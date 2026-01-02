import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(null), // No Redis URL - use in-memory
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('in-memory fallback', () => {
    it('should use in-memory cache when Redis URL not configured', () => {
      expect(service.getCacheMode()).toBe('memory');
      expect(service.isRedisAvailable()).toBe(false);
    });

    it('should set and get values', async () => {
      await service.set('test-key', 'test-value');
      const result = await service.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should set and get JSON values', async () => {
      const testObj = { name: 'Test', count: 42 };
      await service.setJSON('json-key', testObj);
      const result = await service.getJSON<typeof testObj>('json-key');
      expect(result).toEqual(testObj);
    });

    it('should delete values', async () => {
      await service.set('delete-key', 'value');
      expect(await service.get('delete-key')).toBe('value');
      
      const deleted = await service.del('delete-key');
      expect(deleted).toBe(true);
      expect(await service.get('delete-key')).toBeNull();
    });

    it('should respect TTL', async () => {
      // Set with 1 second TTL
      await service.set('ttl-key', 'value', 1);
      expect(await service.get('ttl-key')).toBe('value');
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(await service.get('ttl-key')).toBeNull();
    });

    it('should delete by pattern', async () => {
      await service.set('shop:123:products', 'p1');
      await service.set('shop:123:orders', 'o1');
      await service.set('shop:456:products', 'p2');
      
      const deleted = await service.deletePattern('shop:123:*');
      expect(deleted).toBe(2);
      
      expect(await service.get('shop:123:products')).toBeNull();
      expect(await service.get('shop:123:orders')).toBeNull();
      expect(await service.get('shop:456:products')).toBe('p2');
    });

    it('should check if key exists', async () => {
      await service.set('exists-key', 'value');
      expect(await service.exists('exists-key')).toBe(true);
      expect(await service.exists('nonexistent')).toBe(false);
    });

    it('should increment counter', async () => {
      const count1 = await service.incr('counter');
      expect(count1).toBe(1);
      
      const count2 = await service.incr('counter');
      expect(count2).toBe(2);
    });

    it('should use getOrSet for cache-aside pattern', async () => {
      let factoryCalled = 0;
      const factory = async () => {
        factoryCalled++;
        return { data: 'expensive' };
      };

      // First call - should call factory
      const result1 = await service.getOrSet('cache-aside', factory, 60);
      expect(result1).toEqual({ data: 'expensive' });
      expect(factoryCalled).toBe(1);

      // Second call - should use cache
      const result2 = await service.getOrSet('cache-aside', factory, 60);
      expect(result2).toEqual({ data: 'expensive' });
      expect(factoryCalled).toBe(1); // Factory not called again
    });

    it('should get cache stats', async () => {
      await service.set('stat-key', 'value');
      const stats = await service.getStats();
      
      expect(stats.mode).toBe('memory');
      expect(stats.connected).toBe(false);
      expect(stats.keys).toBeGreaterThanOrEqual(1);
    });

    it('should flush all cache', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      
      await service.flushAll();
      
      expect(await service.get('key1')).toBeNull();
      expect(await service.get('key2')).toBeNull();
    });
  });
});

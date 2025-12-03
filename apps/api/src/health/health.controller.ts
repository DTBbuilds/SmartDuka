import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  /**
   * Main health check endpoint
   * Returns overall system health status
   */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database connectivity
      () => this.mongoose.pingCheck('mongodb'),
      // Memory usage (heap should be under 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // RSS memory (should be under 500MB)
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }

  /**
   * Liveness probe - is the service running?
   * Used by Kubernetes/load balancers
   */
  @Get('live')
  @HealthCheck()
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness probe - is the service ready to accept traffic?
   * Checks database connectivity
   */
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
    ]);
  }

  /**
   * Detailed system info (admin only in production)
   */
  @Get('info')
  info() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.0.1',
      node: process.version,
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      },
    };
  }
}

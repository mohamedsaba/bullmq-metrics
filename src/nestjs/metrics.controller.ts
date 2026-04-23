import { Controller, Get, Inject } from '@nestjs/common';
import { MetricsRegistry } from '../core/metrics.registry';
import { BULLMQ_METRICS_REGISTRY } from './constants';

@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(BULLMQ_METRICS_REGISTRY)
    private readonly registry: MetricsRegistry,
  ) {}

  @Get()
  async getMetrics(): Promise<string> {
    return this.registry.getMetrics();
  }
}

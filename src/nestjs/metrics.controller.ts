import { Controller, Get, Inject, Header } from '@nestjs/common';
import { MetricsRegistry } from '../core/metrics.registry';
import { BULLMQ_METRICS_REGISTRY } from './constants';

@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(BULLMQ_METRICS_REGISTRY)
    private readonly registry: MetricsRegistry,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.registry.getMetrics();
  }
}

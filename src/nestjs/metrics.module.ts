import { Module, DynamicModule, Global, OnModuleInit, OnModuleDestroy, Provider, Type, Inject } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Queue, Worker } from 'bullmq';
import { MetricsRegistry } from '../core/metrics.registry';
import { QueueObserver } from '../core/queue.observer';
import { BullMQMetricsOptions } from '../core/types';
import { MetricsController } from './metrics.controller';
import { BULLMQ_METRICS_OPTIONS, BULLMQ_METRICS_REGISTRY, BULLMQ_METRICS_OBSERVER } from './constants';

@Global()
@Module({
  imports: [DiscoveryModule],
  controllers: [MetricsController],
})
export class BullMQMetricsModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(BULLMQ_METRICS_OBSERVER)
    private readonly observer: QueueObserver,
    @Inject(BULLMQ_METRICS_OPTIONS)
    private readonly options: BullMQMetricsOptions,
    private readonly discoveryService: DiscoveryService,
  ) {}

  static forRoot(options: BullMQMetricsOptions = {}): DynamicModule {
    return {
      module: BullMQMetricsModule,
      providers: [
        {
          provide: BULLMQ_METRICS_OPTIONS,
          useValue: options,
        },
        {
          provide: BULLMQ_METRICS_REGISTRY,
          useFactory: (opts: BullMQMetricsOptions) => new MetricsRegistry(opts),
          inject: [BULLMQ_METRICS_OPTIONS],
        },
        {
          provide: BULLMQ_METRICS_OBSERVER,
          useFactory: (registry: MetricsRegistry, opts: BullMQMetricsOptions) => {
            return new QueueObserver(registry, opts);
          },
          inject: [BULLMQ_METRICS_REGISTRY, BULLMQ_METRICS_OPTIONS],
        },
      ],
      exports: [BULLMQ_METRICS_REGISTRY, BULLMQ_METRICS_OBSERVER],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<BullMQMetricsOptions> | BullMQMetricsOptions;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: BullMQMetricsModule,
      imports: options.imports || [],
      providers: [
        {
          provide: BULLMQ_METRICS_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: BULLMQ_METRICS_REGISTRY,
          useFactory: (opts: BullMQMetricsOptions) => new MetricsRegistry(opts),
          inject: [BULLMQ_METRICS_OPTIONS],
        },
        {
          provide: BULLMQ_METRICS_OBSERVER,
          useFactory: (registry: MetricsRegistry, opts: BullMQMetricsOptions) => {
            return new QueueObserver(registry, opts);
          },
          inject: [BULLMQ_METRICS_REGISTRY, BULLMQ_METRICS_OPTIONS],
        },
      ],
      exports: [BULLMQ_METRICS_REGISTRY, BULLMQ_METRICS_OBSERVER],
    };
  }

  onModuleInit() {
    if (this.options.autoDiscover !== false) {
      this.discoverQueuesAndWorkers();
    }
    this.observer.startPolling();
  }

  async onModuleDestroy() {
    await this.observer.cleanup();
  }

  private discoverQueuesAndWorkers() {
    const providers = this.discoveryService.getProviders();
    
    providers.forEach((wrapper) => {
      const { instance, name } = wrapper;
      if (!instance) return;

      // Check if it's a Queue
      if (instance instanceof Queue || (instance.constructor && instance.constructor.name === 'Queue')) {
        if (this.shouldIncludeQueue(instance.name)) {
          this.observer.observe(instance);
        }
      }

      // Check if it's a Worker
      if (instance instanceof Worker || (instance.constructor && instance.constructor.name === 'Worker')) {
        if (this.shouldIncludeQueue(instance.name)) {
          this.observer.observeWorker(instance);
        }
      }
    });
  }

  private shouldIncludeQueue(queueName: string): boolean {
    if (this.options.include && !this.options.include.includes(queueName)) {
      return false;
    }
    if (this.options.exclude && this.options.exclude.includes(queueName)) {
      return false;
    }
    return true;
  }
}

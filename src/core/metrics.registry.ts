import { Registry, Gauge, Counter, Histogram } from 'prom-client';
import { BullMQMetricsOptions } from './types';

export class MetricsRegistry {
  private readonly registry: Registry;
  private readonly prefix: string;
  private readonly defaultLabels: Record<string, string>;
  
  public readonly queueDepth: Gauge<string>;
  public readonly jobsTotal: Counter<string>;
  public readonly jobDuration: Histogram<string>;
  public readonly jobWaitDuration: Histogram<string>;
  public readonly workersActive: Gauge<string>;
  public readonly queuePaused: Gauge<string>;

  constructor(options: BullMQMetricsOptions = {}, customRegistry?: Registry) {
    this.registry = customRegistry || new Registry();
    this.prefix = options.prefix || '';
    this.defaultLabels = options.labels || {};

    if (Object.keys(this.defaultLabels).length > 0) {
      this.registry.setDefaultLabels(this.defaultLabels);
    }

    const labelNames = ['queue_name'];
    if (options.includeJobName) {
      labelNames.push('job_name');
    }

    this.queueDepth = new Gauge({
      name: `${this.prefix}bullmq_queue_depth`,
      help: 'Current jobs in waiting, active, delayed, and failed states',
      labelNames: ['queue_name', 'status'],
      registers: [this.registry],
    });

    this.jobsTotal = new Counter({
      name: `${this.prefix}bullmq_jobs_total`,
      help: 'Total jobs processed vs. failed',
      labelNames: [...labelNames, 'status'],
      registers: [this.registry],
    });

    this.jobDuration = new Histogram({
      name: `${this.prefix}bullmq_job_duration_seconds`,
      help: 'Execution time per job',
      labelNames: [...labelNames],
      registers: [this.registry],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    this.jobWaitDuration = new Histogram({
      name: `${this.prefix}bullmq_job_wait_duration_seconds`,
      help: 'Time jobs spent waiting before being picked up by a worker',
      labelNames: [...labelNames],
      registers: [this.registry],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    });

    this.workersActive = new Gauge({
      name: `${this.prefix}bullmq_workers_active`,
      help: 'Count of active workers connected to the queue',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });

    this.queuePaused = new Gauge({
      name: `${this.prefix}bullmq_queue_paused`,
      help: 'Whether the queue is currently paused (1 for paused, 0 for active)',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  public getInternalRegistry(): Registry {
    return this.registry;
  }
}

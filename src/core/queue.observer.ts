import { Queue, QueueEvents, Worker, Job } from 'bullmq';
import { MetricsRegistry } from './metrics.registry';
import { BullMQMetricsOptions } from './types';
import { Logger } from '../utils/logger';

export class QueueObserver {
  private readonly logger = new Logger('QueueObserver');
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();
  private readonly queueEvents = new Map<string, QueueEvents>();
  private pollInterval?: NodeJS.Timeout;

  constructor(
    private readonly registry: MetricsRegistry,
    private readonly options: BullMQMetricsOptions = {}
  ) {}

  public observe(queue: Queue): void {
    if (this.queues.has(queue.name)) return;
    this.queues.set(queue.name, queue);

    if (this.options.eventMode !== 'local') {
      this.setupGlobalListeners(queue);
    }
    
    this.logger.log(`Observing queue: ${queue.name} (Mode: ${this.options.eventMode || 'global'})`);
  }

  public observeWorker(worker: Worker): void {
    const queueName = worker.name;
    if (this.workers.has(queueName)) return;
    this.workers.set(queueName, worker);

    if (this.options.eventMode === 'local') {
      this.setupLocalListeners(worker);
    }
    
    this.logger.log(`Observing worker for queue: ${queueName}`);
  }

  private setupGlobalListeners(queue: Queue): void {
    const events = new QueueEvents(queue.name, { connection: queue.opts.connection });
    this.queueEvents.set(queue.name, events);

    events.on('completed', async ({ jobId, returnvalue }) => {
      this.handleJobEvent(queue.name, 'completed', jobId);
    });

    events.on('failed', async ({ jobId, failedReason }) => {
      this.handleJobEvent(queue.name, 'failed', jobId);
    });

    events.on('active', async ({ jobId, prev }) => {
      this.handleActiveEvent(queue.name, jobId);
    });
  }

  private setupLocalListeners(worker: Worker): void {
    worker.on('completed', (job) => {
      this.handleJobEvent(worker.name, 'completed', job.id!, job);
    });

    worker.on('failed', (job, err) => {
      this.handleJobEvent(worker.name, 'failed', job?.id || 'unknown', job);
    });

    worker.on('active', (job) => {
      this.handleActiveEvent(worker.name, job.id!);
    });
  }

  private async handleJobEvent(queueName: string, status: 'completed' | 'failed', jobId: string, jobInstance?: Job): Promise<void> {
    try {
      const labels: any = { queue_name: queueName, status };
      const job = jobInstance || await this.getJob(queueName, jobId);
      
      if (job && this.options.includeJobName) {
        labels.job_name = job.name;
      }

      this.registry.jobsTotal.inc(labels);

      if (job && job.processedOn && job.finishedOn) {
        const duration = (job.finishedOn - job.processedOn) / 1000;
        const durationLabels = { ...labels };
        delete durationLabels.status;
        this.registry.jobDuration.observe(durationLabels, duration);
      }
    } catch (err) {
      this.logger.error(`Error handling ${status} event for job ${jobId}`, (err as Error).stack);
    }
  }

  private async handleActiveEvent(queueName: string, jobId: string): Promise<void> {
    try {
      const job = await this.getJob(queueName, jobId);
      if (job && job.timestamp && job.processedOn) {
        const waitTime = (job.processedOn - job.timestamp) / 1000;
        const labels: any = { queue_name: queueName };
        if (this.options.includeJobName) {
          labels.job_name = job.name;
        }
        this.registry.jobWaitDuration.observe(labels, waitTime);
      }
    } catch (err) {
      this.logger.error(`Error handling active event for job ${jobId}`, (err as Error).stack);
    }
  }

  private async getJob(queueName: string, jobId: string): Promise<Job | undefined> {
    const queue = this.queues.get(queueName);
    if (!queue) return undefined;
    return queue.getJob(jobId);
  }

  public startPolling(): void {
    const interval = this.options.pollInterval || 15000;
    this.pollInterval = setInterval(() => this.poll(), interval);
    this.poll(); // Initial poll
  }

  public stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  public async cleanup(): Promise<void> {
    this.stopPolling();
    for (const events of this.queueEvents.values()) {
      await events.close();
    }
    this.queueEvents.clear();
  }

  private async poll(): Promise<void> {
    for (const [name, queue] of this.queues) {
      try {
        const counts = await queue.getJobCounts();
        this.registry.queueDepth.set({ queue_name: name, status: 'waiting' }, counts.waiting);
        this.registry.queueDepth.set({ queue_name: name, status: 'active' }, counts.active);
        this.registry.queueDepth.set({ queue_name: name, status: 'delayed' }, counts.delayed);
        this.registry.queueDepth.set({ queue_name: name, status: 'failed' }, counts.failed);
        this.registry.queueDepth.set({ queue_name: name, status: 'completed' }, counts.completed);

        const isPaused = await queue.isPaused();
        this.registry.queuePaused.set({ queue_name: name }, isPaused ? 1 : 0);

        // BullMQ doesn't have a direct "active workers count" without some complex calls
        // For now, we set it to 0 or we could use some heuristics
        // A better way is to use queue.getWorkers() but it's not always available/performant
      } catch (err) {
        this.logger.error(`Error polling queue ${name}`, (err as Error).stack);
      }
    }
  }
}

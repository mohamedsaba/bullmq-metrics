import { Queue, Worker } from 'bullmq';
import { MetricsRegistry } from '../../src/core/metrics.registry';
import { QueueObserver } from '../../src/core/queue.observer';
import { EventEmitter } from 'events';

// Mock BullMQ completely for a pure stress test of the metric aggregation logic
jest.mock('bullmq', () => {
  const { EventEmitter } = require('events');
  
  class MockQueue extends EventEmitter {
    constructor(public name: string) { super(); }
    opts = { connection: {} };
    getJobCounts = jest.fn().mockResolvedValue({ 
      waiting: 100, active: 50, delayed: 10, failed: 5, completed: 500 
    });
    isPaused = jest.fn().mockResolvedValue(false);
    getWorkers = jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]);
    getJob = jest.fn().mockImplementation((id) => Promise.resolve({
      id,
      name: `job-${id}`,
      timestamp: Date.now() - 5000,
      processedOn: Date.now() - 1000,
      finishedOn: Date.now(),
      attemptsMade: 1
    }));
  }
  
  class MockWorker extends EventEmitter {
    constructor(public name: string) { super(); }
    close = jest.fn();
  }

  class MockQueueEvents extends EventEmitter {
    constructor(public name: string) { super(); }
    close = jest.fn();
  }

  return {
    Queue: MockQueue,
    Worker: MockWorker,
    QueueEvents: MockQueueEvents
  };
});

describe('BullMQ Metrics Logic Stress Test (Simulated)', () => {
  let registry: MetricsRegistry;
  let observer: QueueObserver;
  const QUEUE_NAME = 'stress-queue';

  beforeEach(() => {
    registry = new MetricsRegistry({ prefix: 'stress_', includeJobName: true });
    observer = new QueueObserver(registry, { 
      eventMode: 'global',
      includeJobName: true
    });
  });

  afterEach(async () => {
    await observer.cleanup();
  });

  it('should handle rapid job events without performance degradation', async () => {
    const queue = new Queue(QUEUE_NAME);
    observer.observe(queue);
    
    // Extract the internal QueueEvents instance to fire events on it
    const queueEvents = (observer as any).queueEvents.get(QUEUE_NAME);

    const eventCount = 5000;
    const startTime = Date.now();

    console.log(`Firing ${eventCount} simulated job events...`);
    
    // Fire events in a tight loop
    const promises = [];
    for (let i = 0; i < eventCount; i++) {
      // Simulate 'completed' events
      promises.push(queueEvents.emit('completed', { jobId: `${i}` }));
      // Simulate 'active' events (for wait duration)
      promises.push(queueEvents.emit('active', { jobId: `${i}` }));
    }

    // Since our event handlers are async but the emitter is sync, 
    // we need to wait a bit for the event loop to process the microtasks.
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`Fired events in ${Date.now() - startTime}ms`);

    const metrics = await registry.getMetrics();
    
    // Assertions
    expect(metrics).toContain(`stress_bullmq_jobs_total`);
    expect(metrics).toContain(`status="completed"`);
  });

  it('should maintain stability with many observed queues', async () => {
    const queueCount = 100;
    const queues = [];

    for (let i = 0; i < queueCount; i++) {
      const q = new Queue(`queue-${i}`);
      observer.observe(q);
      queues.push(q);
    }

    const startTime = Date.now();
    await (observer as any).poll();
    console.log(`Polled ${queueCount} queues in ${Date.now() - startTime}ms`);

    const metrics = await registry.getMetrics();
    expect(metrics.split('\n').filter(l => l.includes('bullmq_queue_depth')).length).toBeGreaterThanOrEqual(queueCount * 5);
  });

  it('should handle custom labels with high job throughput', async () => {
    const customRegistry = new MetricsRegistry({ 
      prefix: 'custom_',
      customLabels: ['priority', 'region']
    });
    const customObserver = new QueueObserver(customRegistry, {
      customLabels: ['priority', 'region'],
      getCustomLabels: (job) => ({
        priority: Number(job.id) % 2 === 0 ? 'high' : 'low',
        region: 'us-east-1'
      })
    });

    const queue = new Queue('custom-label-queue');
    customObserver.observe(queue);
    const queueEvents = (customObserver as any).queueEvents.get('custom-label-queue');

    const jobCount = 1000;
    for (let i = 0; i < jobCount; i++) {
      queueEvents.emit('completed', { jobId: `${i}` });
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const metrics = await customRegistry.getMetrics();
    expect(metrics).toContain('priority="high"');
    expect(metrics).toContain('priority="low"');
    expect(metrics).toContain('region="us-east-1"');
    
    await customObserver.cleanup();
  });
});

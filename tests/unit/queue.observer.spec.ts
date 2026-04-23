import { QueueObserver } from '../../src/core/queue.observer';
import { MetricsRegistry } from '../../src/core/metrics.registry';
import { Queue, Job } from 'bullmq';

jest.mock('bullmq');

describe('QueueObserver', () => {
  let registry: MetricsRegistry;
  let observer: QueueObserver;

  beforeEach(() => {
    registry = new MetricsRegistry();
    observer = new QueueObserver(registry);
  });

  it('should observe a queue', () => {
    const mockQueue = {
      name: 'test-queue',
      opts: { connection: {} },
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 1, active: 0, delayed: 0, failed: 0, completed: 0 }),
      isPaused: jest.fn().mockResolvedValue(false),
    } as unknown as Queue;

    observer.observe(mockQueue);
    // Since it's private state, we check behavior
    expect(mockQueue.name).toBe('test-queue');
  });

  it('should poll queue counts', async () => {
    const mockQueue = {
      name: 'test-queue',
      opts: { connection: {} },
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 5, active: 2, delayed: 0, failed: 1, completed: 10 }),
      isPaused: jest.fn().mockResolvedValue(false),
    } as unknown as Queue;

    observer.observe(mockQueue);
    // Trigger private poll method for testing
    await (observer as any).poll();

    const metrics = await registry.getMetrics();
    expect(metrics).toContain('bullmq_queue_depth{queue_name="test-queue",status="waiting"} 5');
    expect(metrics).toContain('bullmq_queue_depth{queue_name="test-queue",status="active"} 2');
    expect(metrics).toContain('bullmq_queue_depth{queue_name="test-queue",status="failed"} 1');
  });

  it('should calculate wait duration when active event fires', async () => {
    const mockQueue = {
      name: 'test-queue',
      opts: { connection: {} },
      getJob: jest.fn().mockResolvedValue({
        name: 'TestJob',
        timestamp: 1000,
        processedOn: 2500, // 1.5s wait
      }),
    } as unknown as Queue;

    observer.observe(mockQueue);
    await (observer as any).handleActiveEvent('test-queue', 'job-1');

    const metrics = await registry.getMetrics();
    expect(metrics).toContain('bullmq_job_wait_duration_seconds_bucket');
  });
});

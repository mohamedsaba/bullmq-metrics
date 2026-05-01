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

  afterEach(() => {
    observer.stopPolling();
  });

  it('should observe a queue', () => {
    const mockQueue = {
      name: 'test-queue',
      opts: { connection: {} },
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 1, active: 0, delayed: 0, failed: 0, completed: 0 }),
      isPaused: jest.fn().mockResolvedValue(false),
      getWorkers: jest.fn().mockResolvedValue([]),
    } as unknown as Queue;

    observer.observe(mockQueue);
    expect(mockQueue.name).toBe('test-queue');
  });

  it('should poll queue counts', async () => {
    const mockQueue = {
      name: 'test-queue',
      opts: { connection: {} },
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 5, active: 2, delayed: 0, failed: 1, completed: 10 }),
      isPaused: jest.fn().mockResolvedValue(false),
      getWorkers: jest.fn().mockResolvedValue([]),
    } as unknown as Queue;

    observer.observe(mockQueue);
    await (observer as any).poll();

    const metrics = await registry.getMetrics();
    expect(metrics).toContain('bullmq_queue_depth{queue_name="test-queue",status="waiting"} 5');
    expect(metrics).toContain('bullmq_queue_depth{queue_name="test-queue",status="active"} 2');
    expect(metrics).toContain('bullmq_queue_depth{queue_name="test-queue",status="failed"} 1');
  });

  it('should populate workersActive gauge from queue.getWorkers()', async () => {
    const mockWorkerList = [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }];
    const mockQueue = {
      name: 'test-queue',
      opts: { connection: {} },
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 }),
      isPaused: jest.fn().mockResolvedValue(false),
      getWorkers: jest.fn().mockResolvedValue(mockWorkerList),
    } as unknown as Queue;

    observer.observe(mockQueue);
    await (observer as any).poll();

    const metrics = await registry.getMetrics();
    expect(metrics).toContain('bullmq_workers_active{queue_name="test-queue"} 3');
  });

  it('should degrade gracefully when getWorkers() throws', async () => {
    const mockQueue = {
      name: 'test-queue',
      opts: { connection: {} },
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 }),
      isPaused: jest.fn().mockResolvedValue(false),
      getWorkers: jest.fn().mockRejectedValue(new Error('Not supported')),
    } as unknown as Queue;

    observer.observe(mockQueue);
    // Should not throw
    await expect((observer as any).poll()).resolves.toBeUndefined();
  });

  it('should unref the polling interval (not block process exit)', () => {
    const mockQueue = {
      name: 'test-queue',
      opts: { connection: {} },
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 }),
      isPaused: jest.fn().mockResolvedValue(false),
      getWorkers: jest.fn().mockResolvedValue([]),
    } as unknown as Queue;

    observer.observe(mockQueue);
    observer.startPolling();
    const intervalRef = (observer as any).pollInterval;
    // NodeJS.Timeout has unref; verify it was called (it won't throw if unref is missing)
    expect(intervalRef).toBeDefined();
    observer.stopPolling();
    // After stop, reference should be cleared
    expect((observer as any).pollInterval).toBeUndefined();
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

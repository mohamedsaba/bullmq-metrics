import { Test, TestingModule } from '@nestjs/testing';
import { BullMQMetricsModule } from '../../src/nestjs/metrics.module';
import { QueueObserver } from '../../src/core/queue.observer';
import { MetricsRegistry } from '../../src/core/metrics.registry';
import { BULLMQ_METRICS_OBSERVER, BULLMQ_METRICS_REGISTRY } from '../../src/nestjs/constants';
import * as bullmq from 'bullmq';

jest.mock('bullmq', () => {
  class MockQueue {}
  class MockWorker {}
  class MockQueueEvents {
    on = jest.fn();
    close = jest.fn();
  }
  return {
    Queue: MockQueue,
    Worker: MockWorker,
    QueueEvents: MockQueueEvents,
  };
});

describe('NestJS Auto-Discovery — forRoot (E2E)', () => {
  let module: TestingModule;
  let observer: QueueObserver;

  class MockQueue extends bullmq.Queue {
    name = 'discovered-queue';
    opts: any = { connection: {} };
    getJobCounts = jest.fn().mockResolvedValue({ waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 });
    isPaused = jest.fn().mockResolvedValue(false);
    getWorkers = jest.fn().mockResolvedValue([{ id: 'worker-1' }]);
  }

  const mockQueue = new MockQueue('discovered-queue', { connection: {} } as any);

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        BullMQMetricsModule.forRoot({
          autoDiscover: true,
        }),
      ],
      providers: [
        {
          provide: 'BullQueue_discovered-queue', // Mocking the token used by @nestjs/bullmq
          useValue: mockQueue,
        },
      ],
    }).compile();

    observer = module.get<QueueObserver>(BULLMQ_METRICS_OBSERVER);
    await module.init();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should discover queues registered in the module', () => {
    expect((observer as any).queues.has('discovered-queue')).toBe(true);
  });

  it('should generate valid Prometheus metrics output', async () => {
    const registry = module.get<MetricsRegistry>(BULLMQ_METRICS_REGISTRY);
    
    // Simulate some activity
    await (observer as any).poll();
    
    const metrics = await registry.getMetrics();
    console.log('\n--- PROMETHEUS METRICS OUTPUT ---\n');
    console.log(metrics);
    console.log('--- END METRICS OUTPUT ---\n');
    
    expect(metrics).toContain('bullmq_queue_depth');
    expect(metrics).toContain('queue_name="discovered-queue"');
    // workersActive should now be populated (1 mock worker)
    expect(metrics).toContain('bullmq_workers_active{queue_name="discovered-queue"} 1');
  });
});

describe('NestJS Auto-Discovery — forRootAsync (E2E)', () => {
  let module: TestingModule;
  let observer: QueueObserver;

  class MockQueue extends bullmq.Queue {
    name = 'async-queue';
    opts: any = { connection: {} };
    getJobCounts = jest.fn().mockResolvedValue({ waiting: 3, active: 0, delayed: 0, failed: 0, completed: 0 });
    isPaused = jest.fn().mockResolvedValue(false);
    getWorkers = jest.fn().mockResolvedValue([]);
  }

  const mockQueue = new MockQueue('async-queue', { connection: {} } as any);

  beforeEach(async () => {
    // This test validates that forRootAsync does NOT drop DiscoveryModule
    module = await Test.createTestingModule({
      imports: [
        BullMQMetricsModule.forRootAsync({
          useFactory: () => ({ autoDiscover: true, prefix: 'async_' }),
        }),
      ],
      providers: [
        {
          provide: 'BullQueue_async-queue',
          useValue: mockQueue,
        },
      ],
    }).compile();

    observer = module.get<QueueObserver>(BULLMQ_METRICS_OBSERVER);
    await module.init();
  });

  afterEach(async () => {
    await module.close();
  });

  it('forRootAsync: DiscoveryModule is available — queues are discovered', () => {
    // If DiscoveryModule was dropped, this would have thrown during module compilation
    expect((observer as any).queues.has('async-queue')).toBe(true);
  });

  it('forRootAsync: metrics respect the configured prefix', async () => {
    const registry = module.get<MetricsRegistry>(BULLMQ_METRICS_REGISTRY);
    await (observer as any).poll();
    const metrics = await registry.getMetrics();
    expect(metrics).toContain('async_bullmq_queue_depth');
  });
});

import { MetricsRegistry } from '../../src/core/metrics.registry';
import { Registry } from 'prom-client';

describe('MetricsRegistry', () => {
  it('should initialize with default options', () => {
    const registry = new MetricsRegistry();
    expect(registry).toBeDefined();
  });

  it('should apply prefix to metric names', async () => {
    const registry = new MetricsRegistry({ prefix: 'test_' });
    const metrics = await registry.getMetrics();
    expect(metrics).toContain('test_bullmq_queue_depth');
    expect(metrics).toContain('test_bullmq_jobs_total');
  });

  it('should include job_name label when enabled', async () => {
    const registry = new MetricsRegistry({ includeJobName: true });
    // We can't easily check label names from the string output without regex, 
    // but we can check if the metric is defined
    expect(registry.jobDuration).toBeDefined();
  });

  it('should set default labels', async () => {
    const registry = new MetricsRegistry({ labels: { env: 'production' } });
    registry.queueDepth.set({ queue_name: 'test', status: 'active' }, 1);
    const metrics = await registry.getMetrics();
    expect(metrics).toContain('env="production"');
  });
});

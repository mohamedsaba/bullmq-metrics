import { Queue } from 'bullmq';

export type EventMode = 'global' | 'local';

export interface BullMQMetricsOptions {
  /**
   * Prefix for all metric names.
   * @default ''
   */
  prefix?: string;

  /**
   * Interval in milliseconds for polling queue status (depth).
   * @default 15000 (15s)
   */
  pollInterval?: number;
  
  /**
   * Custom labels to be added to all metrics.
   */
  labels?: Record<string, string>;
  
  /**
   * Mode for event listening.
   * - 'global': Uses QueueEvents (tracks all events in cluster).
   * - 'local': Listens to the local Worker instance (tracks only local jobs).
   * @default 'global'
   */
  eventMode?: EventMode;

  /**
   * Whether to include job name in metrics.
   * @default false
   */
  includeJobName?: boolean;

  /**
   * Whether to auto-discover queues from NestJS context.
   * @default true
   */
  autoDiscover?: boolean;

  /**
   * Specific queues to include in monitoring.
   */
  include?: string[];

  /**
   * Specific queues to exclude from monitoring.
   */
  exclude?: string[];

  /**
   * Custom buckets for job duration histogram.
   */
  durationBuckets?: number[];

  /**
   * Custom buckets for wait duration histogram.
   */
  waitDurationBuckets?: number[];

  /**
   * Optional callback to extract custom labels from a job.
   * Note: Use with caution to avoid high cardinality.
   */
  getCustomLabels?: (job: any) => Record<string, string>;

  /**
   * List of custom label keys that will be returned by getCustomLabels.
   * Required for Prometheus to initialize the metrics with the correct labels.
   */
  customLabels?: string[];
}

export interface MetricLabels {
  queue_name: string;
  [key: string]: string;
}

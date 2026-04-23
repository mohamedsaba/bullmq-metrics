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
}

export interface MetricLabels {
  queue_name: string;
  [key: string]: string;
}

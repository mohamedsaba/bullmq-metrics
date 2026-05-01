# @mohamedsaba/bullmq-metrics

A zero-configuration Prometheus metrics exporter for [BullMQ](https://bullmq.io/). Designed for Node.js and NestJS environments.

[![npm version](https://img.shields.io/npm/v/@mohamedsaba/bullmq-metrics.svg)](https://www.npmjs.com/package/@mohamedsaba/bullmq-metrics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Zero-Config Auto-Discovery**: Automatically finds and monitors all BullMQ Queues and Workers in your NestJS application.
- **Prometheus Standard**: Exposes metrics in the standard exposition format via `prom-client`.
- **Hybrid Monitoring**: Combines real-time event listeners (throughput/latency) with lightweight polling (queue depth).
- **Cluster Ready**: Support for local vs. global event modes to prevent over-counting in distributed environments.
- **Wait-Time Tracking**: Monitor how long jobs sit in the queue before being processed.
- **Job Retry Tracking**: New `bullmq_job_attempts_total` metric to monitor job retries.
- **Custom Histogram Buckets**: Define precise latency boundaries for job execution and wait times.
- **Dynamic Job Labels**: Extract business data (e.g., `user_id`, `tenant_id`) from job payloads into metrics.
- **Worker Count**: Reports the number of active workers per queue from Redis.

## Installation

```bash
npm install @mohamedsaba/bullmq-metrics prom-client bullmq
```

## Usage (NestJS)

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { BullMQMetricsModule } from '@mohamedsaba/bullmq-metrics';

@Module({
  imports: [
    BullMQMetricsModule.forRoot({
      prefix: 'my_app_',
      labels: { service: 'orders-api' },
      includeJobName: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Async Configuration (with ConfigService)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullMQMetricsModule } from '@mohamedsaba/bullmq-metrics';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BullMQMetricsModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        prefix: config.get('METRICS_PREFIX', ''),
        labels: { service: config.get('SERVICE_NAME', 'api') },
      }),
    }),
  ],
})
export class AppModule {}
```

### 3. Access Metrics

The metrics will be available at the `/metrics` endpoint by default.

```bash
curl http://localhost:3000/metrics
```

## Configuration

| Option | Description | Default |
| --- | --- | --- |
| `prefix` | Prefix for all metric names | `""` |
| `pollInterval` | Interval (ms) for polling queue depth and worker count | `15000` |
| `labels` | Global labels added to all metrics | `{}` |
| `eventMode` | `'global'` (QueueEvents) or `'local'` (Worker events) | `'global'` |
| `includeJobName`| Include `job_name` label in metrics | `false` |
| `autoDiscover` | Automatically find Queues and Workers in NestJS context | `true` |
| `durationBuckets` | Custom buckets for job duration histogram | `[0.01, ..., 10]` |
| `waitDurationBuckets` | Custom buckets for job wait duration histogram | `[0.1, ..., 60]` |
| `getCustomLabels` | Callback function to extract dynamic labels from jobs | `undefined` |
| `include` | Array of queue names to exclusively monitor | `undefined` |
| `exclude` | Array of queue names to ignore | `undefined` |

### Custom Labels Example

```typescript
BullMQMetricsModule.forRoot({
  includeJobName: true,
  getCustomLabels: (job) => ({
    user_id: job.data.userId || 'anonymous',
    plan: job.data.userPlan || 'free',
  }),
}),
```

## Metrics Exported

| Metric | Type | Description |
| --- | --- | --- |
| `bullmq_queue_depth` | Gauge | Jobs in `waiting`, `active`, `delayed`, `failed`, and `completed` states |
| `bullmq_jobs_total` | Counter | Total jobs processed vs. failed |
| `bullmq_job_duration_seconds` | Histogram | Job execution time |
| `bullmq_job_wait_duration_seconds` | Histogram | Time a job waited in queue before a worker picked it up |
| `bullmq_job_attempts_total` | Counter | Total number of attempts made for jobs (retries) |
| `bullmq_workers_active` | Gauge | Number of workers currently registered for the queue (from Redis) |
| `bullmq_queue_paused` | Gauge | `1` if queue is paused, `0` if active |

All metric names respect the optional `prefix` configuration option.

## License

MIT

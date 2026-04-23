# BullMQ Metrics

A zero-configuration Prometheus metrics exporter for [BullMQ](https://bullmq.io/). Designed for Node.js and NestJS environments.

[![npm version](https://img.shields.io/npm/v/bullmq-metrics.svg)](https://www.npmjs.com/package/bullmq-metrics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Zero-Config Auto-Discovery**: Automatically finds and monitors all BullMQ Queues and Workers in your NestJS application.
- **Prometheus Standard**: Exposes metrics in the standard exposition format via `prom-client`.
- **Hybrid Monitoring**: Combines real-time event listeners (throughput/latency) with lightweight polling (queue depth).
- **Cluster Ready**: Support for local vs. global event modes to prevent over-counting in distributed environments.
- **Wait-Time Tracking**: Monitor how long jobs sit in the queue before being processed.
- **Job-Level Granularity**: Optional labeling by `job_name` for detailed performance analysis.

## Installation

```bash
npm install bullmq-metrics prom-client bullmq
```

## Usage (NestJS)

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { BullMQMetricsModule } from 'bullmq-metrics';

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

### 2. Access Metrics

The metrics will be available at the `/metrics` endpoint by default.

```bash
curl http://localhost:3000/metrics
```

## Configuration

| Option | Description | Default |
| --- | --- | --- |
| `prefix` | Prefix for all metric names | `""` |
| `pollInterval` | Interval (ms) for polling queue depth | `15000` |
| `labels` | Global labels added to all metrics | `{}` |
| `eventMode` | `'global'` (QueueEvents) or `'local'` (Worker events) | `'global'` |
| `includeJobName`| Include `job_name` label in metrics | `false` |
| `autoDiscover` | Automatically find Queues and Workers | `true` |
| `include` | Array of queue names to exclusively monitor | `undefined` |
| `exclude` | Array of queue names to ignore | `undefined` |

## Metrics Exported

- `bullmq_queue_depth`: Gauges for `waiting`, `active`, `delayed`, `failed`, and `completed` jobs.
- `bullmq_jobs_total`: Counter for total jobs processed vs. failed.
- `bullmq_job_duration_seconds`: Histogram of job execution time.
- `bullmq_job_wait_duration_seconds`: Histogram of time spent waiting in the queue.
- `bullmq_queue_paused`: Boolean gauge for queue pause state.

## License

MIT

# Changelog

All notable changes to `@mohamedsaba/bullmq-metrics` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-05-01

### Added
- **Job Attempt Tracking**: New `bullmq_job_attempts_total` metric to monitor job retries and "flaky" jobs.
- **Custom Histogram Buckets**: Options `durationBuckets` and `waitDurationBuckets` added to `BullMQMetricsOptions` for fine-grained latency analysis.
- **Dynamic Job Labels**: Added `getCustomLabels` callback to extract dynamic metadata (e.g., `user_id`) from job payloads into Prometheus labels.

### Changed
- **QueueObserver Refactor**: Standardized label extraction logic into a single helper method for consistency across all metrics.

## [1.1.0] - 2026-04-28

### Added
- **`bullmq_workers_active` gauge is now populated**: the polling cycle calls `queue.getWorkers()` to fetch the number of currently registered workers from Redis and sets the gauge correctly. In v1.0.0 this metric was declared but never given a value.
- **Graceful shutdown support**: the polling `setInterval` timer now calls `.unref()` so it will not prevent the Node.js process from exiting naturally after all other work is done.
- **`forRootAsync` async configuration example** added to README.

### Fixed
- **Critical (`forRootAsync`)**: `DiscoveryModule` was silently dropped from the NestJS module `imports` array when `options.imports` was provided or defaulted to `[]`. This caused `DiscoveryService` injection to fail at runtime for all `forRootAsync` consumers. The fix merges `[DiscoveryModule, ...options.imports]` explicitly.
- **`stopPolling`**: the `pollInterval` reference was not cleared to `undefined` after `clearInterval`, which could allow double-clear on repeated calls.
- **Build script**: `rimraf dist && tsc` left the `.tsbuildinfo` file in place; on the next run the TypeScript incremental compiler would see an up-to-date cache and emit nothing, resulting in an empty `dist/`. Changed to `rimraf dist .tsbuildinfo && tsc`.
- **README**: badge URL and all code examples referenced the unscoped package name `bullmq-metrics` instead of the correct scoped name `@mohamedsaba/bullmq-metrics`.

---

## [1.0.0] - 2026-04-28

### Added
- Initial release.
- Zero-configuration NestJS module (`BullMQMetricsModule.forRoot` / `.forRootAsync`).
- Auto-discovery of `Queue` and `Worker` instances via `DiscoveryService`.
- Prometheus metrics: `bullmq_queue_depth`, `bullmq_jobs_total`, `bullmq_job_duration_seconds`, `bullmq_job_wait_duration_seconds`, `bullmq_workers_active`, `bullmq_queue_paused`.
- `global` and `local` event modes for cluster-safe metric collection.
- `/metrics` HTTP endpoint via built-in `MetricsController`.

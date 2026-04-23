# BullMQ Metrics: Architecture & Technical Specification

## 1. Executive Summary
**BullMQ Metrics** is a zero-configuration metrics exporter designed for Node.js environments utilizing BullMQ. It wraps existing BullMQ queue instances and exposes a `/metrics` endpoint that outputs real-time queue health data (depth, throughput, latency, and error rates) in the standard Prometheus format.

---

## 2. The Problem: The "Black Box"
When running background jobs in NestJS/Node.js using BullMQ, the queue system acts as a black box in production.

**Pain Points:**
* **Lack of Real-Time Visibility:** You cannot easily track if queues are backing up, if failure rates are spiking, or if processing times are degrading without constantly staring at a UI like BullBoard.
* **Scaling Blind Spots:** Horizontal Pod Autoscalers (HPA) in Kubernetes cannot scale workers efficiently without raw, accessible queue data.
* **Boilerplate Fatigue:** Teams repeatedly write custom `queue.getJobCounts()` wrappers to feed metrics into Grafana or Datadog, creating unmaintainable technical debt.

---

## 3. The Fix / The Solution
We need a lightweight, non-intrusive library that acts as a "passive observer." 

**Core Mechanics:**
* **Zero-Config:** Plug-and-play setup via dependency injection (the NestJS `forRoot` pattern).
* **Low Overhead:** A hybrid approach using BullMQ's native event listeners for throughput/latency, combined with lightweight, spaced-out polling for static queue depth.
* **Standardized Output:** Uses `prom-client` to translate BullMQ's internal state into the standardized Prometheus exposition format, allowing for instant Grafana integration and automated alerting.

---

## 4. System Architecture

The architecture is divided into two main layers to ensure it remains clean and testable: the **Framework-Agnostic Core** and the **Framework Adapter**.

### Component Breakdown

#### A. Core Engine (`src/core`)
* **`MetricsRegistry`:** Wraps `prom-client`. It holds the definitions for the four critical metrics:
    1.  `bullmq_queue_depth` (Gauge): Current jobs in waiting, active, delayed, and failed states.
    2.  `bullmq_jobs_total` (Counter): Total jobs processed vs. failed.
    3.  `bullmq_job_duration_seconds` (Histogram): Execution time per job.
* **`QueueObserver`:** The engine that connects to the provided BullMQ queues. 
    * *Event-Driven:* Listens to `global:completed` and `global:failed` events for real-time counters and latency histograms.
    * *Polling-Driven:* Periodically calls `getJobCounts()` (e.g., every 15s) for gauge metrics.

#### B. Framework Adapter (`src/nestjs`)
* **`BullMQMetricsModule`:** A NestJS `DynamicModule`. Handles dependency injection and auto-discovery of the injected queues.
* **`MetricsController`:** Mounts a lightweight controller to serve the registry output on the `/metrics` HTTP route.

---

## 5. Folder Structure

The project is structured as a standard TypeScript package, managed via `pnpm`. 

```text
bullmq-metrics/
├── package.json          # Uses pnpm as the package manager
├── tsconfig.json         # Strict TypeScript configuration
├── src/
│   ├── index.ts          # Public API exports
│   ├── core/             # Framework-agnostic logic
│   │   ├── metrics.registry.ts   # prom-client wrapper
│   │   ├── queue.observer.ts     # Hybrid event/polling logic
│   │   └── types.ts              # Interfaces and generic types
│   ├── nestjs/           # NestJS specific bindings
│   │   ├── metrics.module.ts     # DynamicModule setup
│   │   ├── metrics.controller.ts # /metrics endpoint
│   │   └── constants.ts          # Injection tokens
│   └── utils/
│       └── logger.ts             # Internal debugging logger
├── tests/                # Test suites
│   ├── e2e/              # End-to-end tests with real Redis
│   └── unit/             # Unit tests for aggregations
└── README.md             # Setup guide and Grafana dashboard payload
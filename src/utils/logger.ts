export class Logger {
  constructor(private readonly context: string) {}

  log(message: string) {
    console.log(`[BullMQ-Metrics] [${this.context}] ${message}`);
  }

  error(message: string, trace?: string) {
    console.error(`[BullMQ-Metrics] [${this.context}] ${message}`, trace);
  }

  warn(message: string) {
    console.warn(`[BullMQ-Metrics] [${this.context}] ${message}`);
  }

  debug(message: string) {
    if (process.env.DEBUG === 'bullmq-metrics') {
      console.debug(`[BullMQ-Metrics] [${this.context}] ${message}`);
    }
  }
}

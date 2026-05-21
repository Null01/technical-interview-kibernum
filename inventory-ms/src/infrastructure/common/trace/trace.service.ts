/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

interface TraceContext {
  traceId: string;
}

@Injectable()
export class TraceService {
  private readonly storage = new AsyncLocalStorage<TraceContext>();

  run<T>(traceId: string, fn: () => T): T {
    return this.storage.run({ traceId }, fn);
  }

  getTraceId(): string {
    return this.storage.getStore()?.traceId ?? randomUUID();
  }
}

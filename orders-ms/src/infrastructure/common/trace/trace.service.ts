/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable }    from '@nestjs/common';
import { randomUUID }    from 'crypto';
import { LogContext }    from '../logging/log-context.interface';
import {
  runWithLogContext,
  getLogContext,
  enrichLogContext,
} from '../logging/logger.storage';

/**
 * Manages the per-request LogContext stored in AsyncLocalStorage.
 *
 * Injected into TraceInterceptor (which initiates the context on every request)
 * and into exception filters (which read the context to include IDs in error responses).
 *
 * Context is set once per request/message by TraceInterceptor and is automatically
 * propagated to all async continuations (Promises, async/await, RxJS pipelines)
 * started within the `run()` scope.
 */
@Injectable()
export class TraceService {

  /** Starts an AsyncLocalStorage scope carrying `context` for all async work done inside `fn`. */
  run<T>(context: LogContext, fn: () => T): T {
    return runWithLogContext(context, fn);
  }

  /** Returns the full context for the current async scope, or an empty object if none is active. */
  getContext(): Partial<LogContext> {
    return getLogContext();
  }

  /** Returns the transactionId for the current request, or a fallback UUID if called outside a scope. */
  getTransactionId(): string {
    return getLogContext().transactionId ?? randomUUID();
  }

  /** Returns the correlationId for the current request, or a fallback UUID if called outside a scope. */
  getCorrelationId(): string {
    return getLogContext().correlationId ?? randomUUID();
  }

  /** @deprecated Use getTransactionId() — kept for backward compatibility. */
  getTraceId(): string {
    return this.getTransactionId();
  }

  /**
   * Enriches the active context with additional fields (e.g. spanId for a sub-operation).
   * No-op if called outside a `run()` scope.
   */
  enrich(partial: Partial<LogContext>): void {
    enrichLogContext(partial);
  }
}

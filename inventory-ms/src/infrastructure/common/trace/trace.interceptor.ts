/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { randomUUID } from 'crypto'
import { Request, Response } from 'express'
import { KafkaContext } from '@nestjs/microservices'
import { TraceService } from './trace.service'

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TraceInterceptor.name)

  constructor (private readonly traceService: TraceService) {}

  intercept (context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const type = context.getType<'http' | 'rpc'>()
    const start = Date.now()
    let traceId: string

    if (type === 'http') {
      const req = context.switchToHttp().getRequest<Request>()
      traceId = (req.headers['x-trace-id'] as string) ?? randomUUID()
      context.switchToHttp().getResponse<Response>().setHeader('x-trace-id', traceId)

      const bodyLog = req.body && Object.keys(req.body).length ? ` body=${JSON.stringify(req.body)}` : ''
      this.logger.log(`[${traceId}] → ${req.method} ${req.url}${bodyLog}`)
    } else {
      const kafkaCtx = context.switchToRpc().getContext<KafkaContext>()
      const payload = context.switchToRpc().getData<unknown>()
      traceId = randomUUID()

      this.logger.log(
        `[${traceId}] ← KAFKA recv topic=${kafkaCtx.getTopic()}` +
        ` partition=${kafkaCtx.getPartition()} offset=${kafkaCtx.getMessage().offset}` +
        ` payload=${JSON.stringify(payload)}`,
      )
    }

    return new Observable(subscriber => {
      this.traceService.run(traceId, () => {
        next.handle().pipe(
          tap({
            next: (value) => {
              const elapsed = Date.now() - start
              const resLog = value != null ? ` res=${JSON.stringify(value)}` : ''
              if (type === 'http') {
                const status = context.switchToHttp().getResponse<Response>().statusCode
                this.logger.log(`[${traceId}] ← ${status} ${elapsed}ms${resLog}`)
              } else {
                this.logger.log(`[${traceId}] → KAFKA ack ${elapsed}ms${resLog}`)
              }
            },
            error: () => {
              this.logger.warn(`[${traceId}] failed after ${Date.now() - start}ms`)
            },
          }),
        ).subscribe({
          next: v => subscriber.next(v),
          error: e => subscriber.error(e),
          complete: () => subscriber.complete(),
        })
      })
    })
  }
}

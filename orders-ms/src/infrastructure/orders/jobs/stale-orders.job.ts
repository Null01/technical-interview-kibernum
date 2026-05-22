/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-21
 */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { CancelOrderUseCase } from '@application/order/use-cases/cancel-order.use-case'
import { OrderCancellationReason } from '@domain/order/enums/order-cancellation-reason.enum'
import { ORDER_COMMAND_REPOSITORY } from '@domain/order/ports/order-command.repository.port'
import type { OrderCommandRepositoryPort } from '@domain/order/ports/order-command.repository.port'
import { Inject } from '@nestjs/common'
import { AppLoggerService } from '../../common/logging/app-logger.service'
import { buildInitialContext, runWithLogContext } from '../../common/logging/logger.storage'

@Injectable()
export class StaleOrdersJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new AppLoggerService(StaleOrdersJob.name)
  private intervalRef: ReturnType<typeof setInterval> | null = null

  constructor (
    @Inject(ORDER_COMMAND_REPOSITORY)
    private readonly orderRepository: OrderCommandRepositoryPort,
    private readonly cancelOrder: CancelOrderUseCase,
  ) {}

  onModuleInit (): void {
    const intervalMs = Number(process.env.STALE_ORDER_CHECK_INTERVAL_MS ?? 300_000)  // 5 min
    this.intervalRef = setInterval(() => void this.run(), intervalMs)
    this.logger.log(
      `StaleOrdersJob started — scanning every ${intervalMs / 1000}s ` +
      `for orders pending > ${this.timeoutOrdersExpiredMinutes()}min`,
    )
  }

  onModuleDestroy (): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef)
      this.logger.log('StaleOrdersJob stopped')
    }
  }

  async run (): Promise<void> {
    const ctx = buildInitialContext()
    const timeoutOrdersExpired = this.timeoutOrdersExpiredMinutes()

    await runWithLogContext(ctx, async () => {
      const stale = await this.orderRepository.findStalePending(timeoutOrdersExpired)

      if (!stale.length) return

      this.logger.warn(
        `Found ${stale.length} stale PENDING order(s) older than ${timeoutOrdersExpired} min — cancelling`,
      )

      for (const order of stale) {
        try {
          await this.cancelOrder.execute(order.id, OrderCancellationReason.PENDING_TIMEOUT)
          this.logger.log(`Stale order #${order.id} cancelled (created at ${order.createdAt.toISOString()})`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          this.logger.error(`Failed to cancel stale order #${order.id}: ${msg}`)
        }
      }
    })
  }

  private timeoutOrdersExpiredMinutes (): number {
    return Number(process.env.STALE_ORDER_TIMEOUT_MINUTES ?? 30)
  }
}

/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_REPOSITORY } from '@domain/payment/ports/payment.repository.port';
import type { PaymentRepositoryPort } from '@domain/payment/ports/payment.repository.port';
import { PaymentModel } from '@domain/payment/models/payment.model';
import { PaymentNotFoundException } from '@domain/payment/exceptions/payment-not-found.exception';

@Injectable()
export class FindPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepositoryPort,
  ) {}

  findAll(): Promise<PaymentModel[]> {
    return this.paymentRepository.findAll();
  }

  async findById(id: number): Promise<PaymentModel> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) throw new PaymentNotFoundException(id);
    return payment;
  }

  async findByOrderId(orderId: number): Promise<PaymentModel> {
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) throw new PaymentNotFoundException(orderId);
    return payment;
  }
}

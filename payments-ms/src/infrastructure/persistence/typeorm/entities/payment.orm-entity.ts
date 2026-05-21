/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus } from '@domain/payment/enums/payment-status.enum';

@Entity('payments')
export class PaymentOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Clave de idempotencia: un solo pago por orden. */
  @Column({ name: 'order_id', unique: true })
  orderId: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'COP' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ name: 'transaction_id', type: 'varchar', length: 100, nullable: true })
  transactionId: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

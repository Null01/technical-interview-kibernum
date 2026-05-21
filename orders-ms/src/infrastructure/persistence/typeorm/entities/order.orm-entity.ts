/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { OrderStatus } from '@domain/order/enums/order-status.enum';
import { AuditableEntity } from './auditable.orm-entity';

@Entity('orders')
export class OrderOrmEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ type: 'numeric', precision: 10, scale: 3 })
  quantity: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus, enumName: 'order_status', default: OrderStatus.PENDING })
  status: OrderStatus;
}

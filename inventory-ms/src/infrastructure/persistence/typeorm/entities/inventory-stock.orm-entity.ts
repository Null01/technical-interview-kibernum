/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditableEntity } from './auditable.orm-entity';
import { ProductOrmEntity } from './product.orm-entity';

@Entity('inventory_stock')
@Unique(['productId'])
export class InventoryStockOrmEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => ProductOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: ProductOrmEntity;

  @Column({ type: 'numeric', precision: 10, scale: 3, default: 0 })
  quantity: number;

  @Column({ name: 'reserved_qty', type: 'numeric', precision: 10, scale: 3, default: 0 })
  reservedQty: number;

  @Column({ name: 'last_movement_at', type: 'timestamptz', nullable: true })
  lastMovementAt: Date | null;

  @Column({ name: 'last_count_at', type: 'timestamptz', nullable: true })
  lastCountAt: Date | null;
}

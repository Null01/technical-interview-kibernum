/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MovementType } from '@domain/inventory/enums/movement-type.enum';
import { ImmutableAuditEntity } from './auditable.orm-entity';
import { ProductOrmEntity } from './product.orm-entity';

@Entity('stock_movements')
export class StockMovementOrmEntity extends ImmutableAuditEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => ProductOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: ProductOrmEntity;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ name: 'qty_change', type: 'numeric', precision: 10, scale: 3 })
  qtyChange: number;

  @Column({ name: 'qty_before', type: 'numeric', precision: 10, scale: 3 })
  qtyBefore: number;

  @Column({ name: 'qty_after', type: 'numeric', precision: 10, scale: 3 })
  qtyAfter: number;

  @Column({ type: 'varchar', name: 'reference_type', length: 50, nullable: true })
  referenceType: string | null;

  @Column({ type: 'int', name: 'reference_id', nullable: true })
  referenceId: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}

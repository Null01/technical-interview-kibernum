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
} from 'typeorm';
import { AuditableEntity } from './auditable.orm-entity';
import { BrandOrmEntity } from './brand.orm-entity';
import { CategoryOrmEntity } from './category.orm-entity';
import { UnitOfMeasureOrmEntity } from './unit-of-measure.orm-entity';

@Entity('products')
export class ProductOrmEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  sku: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  barcode: string | null;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => CategoryOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: CategoryOrmEntity;

  @Column({ type: 'int', name: 'brand_id', nullable: true })
  brandId: number | null;

  @ManyToOne(() => BrandOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brand: BrandOrmEntity;

  @Column({ name: 'uom_id' })
  uomId: number;

  @ManyToOne(() => UnitOfMeasureOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uom_id' })
  uom: UnitOfMeasureOrmEntity;

  @Column({ name: 'purchase_price', type: 'numeric', precision: 10, scale: 2, default: 0 })
  purchasePrice: number;

  @Column({ name: 'min_stock', type: 'numeric', precision: 10, scale: 3, default: 0 })
  minStock: number;

  @Column({ name: 'max_stock', type: 'numeric', precision: 10, scale: 3, nullable: true })
  maxStock: number | null;

  @Column({ name: 'reorder_point', type: 'numeric', precision: 10, scale: 3, default: 0 })
  reorderPoint: number;

  @Column({ name: 'reorder_quantity', type: 'numeric', precision: 10, scale: 3, default: 0 })
  reorderQuantity: number;

  @Column({ name: 'is_perishable', default: false })
  isPerishable: boolean;

  @Column({ type: 'int', name: 'shelf_life_days', nullable: true })
  shelfLifeDays: number | null;

  @Column({ name: 'requires_refrigeration', default: false })
  requiresRefrigeration: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}

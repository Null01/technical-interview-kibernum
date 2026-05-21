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
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from './auditable.orm-entity';

@Entity('categories')
export class CategoryOrmEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number;

  @ManyToOne(() => CategoryOrmEntity, (cat) => cat.children, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_id' })
  parent: CategoryOrmEntity;

  @OneToMany(() => CategoryOrmEntity, (cat) => cat.parent)
  children: CategoryOrmEntity[];

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}

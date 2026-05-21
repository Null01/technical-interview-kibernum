/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from './auditable.orm-entity';

@Entity('brands')
export class BrandOrmEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'country_of_origin', length: 100, nullable: true })
  countryOfOrigin: string;
}

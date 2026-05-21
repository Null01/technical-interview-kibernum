/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UomType } from '@domain/unit-of-measure/models/unit-of-measure.model';
import { AuditableEntity } from './auditable.orm-entity';

@Entity('units_of_measure')
export class UnitOfMeasureOrmEntity extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 20, unique: true })
  abbreviation: string;

  @Column({ type: 'enum', enum: UomType })
  type: UomType;
}

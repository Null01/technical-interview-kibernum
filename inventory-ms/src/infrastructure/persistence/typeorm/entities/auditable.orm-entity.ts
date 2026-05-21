/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class AuditableEntity {
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', length: 100, default: 'system' })
  createdBy: string;

  @Column({ name: 'updated_by', length: 100, default: 'system' })
  updatedBy: string;
}

/** Versión inmutable para tablas append-only (e.g. stock_movements). */
export abstract class ImmutableAuditEntity {
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', length: 100, default: 'system' })
  createdBy: string;
}

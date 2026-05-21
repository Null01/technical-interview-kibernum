/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { OutboxEventStatus } from '@domain/shared/outbox/enums/outbox-event-status.enum';

@Entity('outbox_events')
export class OutboxEventOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'aggregate_type' })
  aggregateType: string;

  @Column({ name: 'aggregate_id' })
  aggregateId: number;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: OutboxEventStatus,
    enumName: 'outbox_event_status',
    default: OutboxEventStatus.PENDING,
  })
  status: OutboxEventStatus;

  @Column({ default: 0 })
  retries: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;
}

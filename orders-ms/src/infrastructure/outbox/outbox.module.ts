/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module } from '@nestjs/common';
import { CommonModule }      from '../common/common.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { MessagingModule }   from '../messaging/messaging.module';
import { OutboxRelayService } from './outbox-relay.service';

@Module({
  imports: [CommonModule, PersistenceModule, MessagingModule],
  providers: [OutboxRelayService],
})
export class OutboxModule {}

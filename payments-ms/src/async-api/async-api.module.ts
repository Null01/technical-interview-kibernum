/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module } from '@nestjs/common';
import { AsyncApiController } from './async-api.controller';

@Module({
  controllers: [AsyncApiController],
})
export class AsyncApiModule {}

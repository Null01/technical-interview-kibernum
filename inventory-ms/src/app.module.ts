/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsyncApiModule } from './async-api/async-api.module';
import { InventoryFeatureModule } from './infrastructure/inventory/inventory.module';
import { CommonModule } from './infrastructure/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type:             'postgres',
      host:             process.env.DB_HOST     ?? 'localhost',
      port:             parseInt(process.env.DB_PORT ?? '5432'),
      username:         process.env.DB_USER     ?? 'admin',
      password:         process.env.DB_PASSWORD ?? 'admin123',
      database:         process.env.DB_NAME     ?? 'inventory_db',
      autoLoadEntities: true,
      synchronize:      (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
    }),
    CommonModule,
    InventoryFeatureModule,
    AsyncApiModule,
  ],
})
export class AppModule {}

/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable } from '@nestjs/common';
import { OrderModel } from '@domain/order/models/order.model';
import { OrderOrmEntity } from '../entities/order.orm-entity';

@Injectable()
export class OrderMapper {
  toDomain(entity: OrderOrmEntity): OrderModel {
    return {
      id:          entity.id,
      productId:   entity.productId,
      quantity:    Number(entity.quantity),
      customerId:  entity.customerId,
      totalAmount: Number(entity.totalAmount),
      status:      entity.status,
      notes:       entity.notes ?? null,
      createdAt:   entity.createdAt,
      updatedAt:   entity.updatedAt,
    };
  }

  toOrm(model: Omit<OrderModel, 'id' | 'createdAt' | 'updatedAt'>): Partial<OrderOrmEntity> {
    return {
      productId:   model.productId,
      quantity:    model.quantity,
      customerId:  model.customerId,
      totalAmount: model.totalAmount,
      status:      model.status,
      notes:       model.notes ?? null,
    };
  }
}

/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import type { ProductModel } from '@domain/product/models/product.model';
import { PRODUCT_REPOSITORY } from '@domain/product/ports/product.repository.port';
import type { ProductRepositoryPort } from '@domain/product/ports/product.repository.port';
import type { CreateProductCommand } from '../commands/create-product.command';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(command: CreateProductCommand): Promise<ProductModel> {
    return this.productRepository.save({
      sku: command.sku,
      barcode: command.barcode ?? null,
      name: command.name,
      description: command.description ?? null,
      categoryId: command.categoryId,
      brandId: command.brandId ?? null,
      uomId: command.uomId,
      purchasePrice: command.purchasePrice,
      minStock: command.minStock ?? 0,
      maxStock: command.maxStock ?? null,
      reorderPoint: command.reorderPoint ?? 0,
      reorderQuantity: command.reorderQuantity ?? 0,
      isPerishable: command.isPerishable ?? false,
      shelfLifeDays: command.shelfLifeDays ?? null,
      requiresRefrigeration: command.requiresRefrigeration ?? false,
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    });
  }
}

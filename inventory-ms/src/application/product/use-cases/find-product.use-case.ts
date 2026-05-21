/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { ProductNotFoundException } from '@domain/product/exceptions/product-not-found.exception';
import type { ProductModel } from '@domain/product/models/product.model';
import { PRODUCT_REPOSITORY } from '@domain/product/ports/product.repository.port';
import type { ProductRepositoryPort } from '@domain/product/ports/product.repository.port';

@Injectable()
export class FindProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  findAll(): Promise<ProductModel[]> {
    return this.productRepository.findAll();
  }

  async findById(id: number): Promise<ProductModel> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new ProductNotFoundException(id);
    }
    return product;
  }
}

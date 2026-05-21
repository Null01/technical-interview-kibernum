import { ProductModel } from '../models/product.model';

export const PRODUCT_REPOSITORY = 'PRODUCT_REPOSITORY';

export interface ProductRepositoryPort {
  findById(id: number): Promise<ProductModel | null>;
  findAll(): Promise<ProductModel[]>;
  save(product: Omit<ProductModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductModel>;
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../catalog/entities/product.entity';

export interface CartResponse {
  items: {
    productId: string;
    name: string;
    image: string;
    price: number;
    discount: number;
    amount: number;
    lineTotal: number;
    unavailable: boolean;
  }[];
  itemsPrice: number;
  totalQuantity: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getCart(userId: string): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);
    return this.buildCartResponse(cart);
  }

  async addItem(userId: string, productId: string, amount: number): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);

    // Validate product exists
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    // Check stock
    if (amount > product.countInStock) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'insufficient_stock',
        message: `Only ${product.countInStock} items available in stock`,
      });
    }

    // Check if product already in cart → merge amount
    const existingItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      const newAmount = existingItem.amount + amount;
      if (newAmount > product.countInStock) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          code: 'insufficient_stock',
          message: `Only ${product.countInStock} items available in stock (you already have ${existingItem.amount} in cart)`,
        });
      }
      existingItem.amount = newAmount;
      await this.cartItemRepository.save(existingItem);
    } else {
      const newItem = this.cartItemRepository.create({
        id: crypto.randomUUID(),
        cartId: cart.id,
        productId,
        amount,
      });
      await this.cartItemRepository.save(newItem);
    }

    // Reload cart
    const updatedCart = await this.getOrCreateCart(userId);
    return this.buildCartResponse(updatedCart);
  }

  async updateItem(userId: string, productId: string, amount: number): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId },
    });

    if (!item) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Item not found in cart',
      });
    }

    // amount = 0 means remove
    if (amount === 0) {
      await this.cartItemRepository.remove(item);
    } else {
      // Validate stock
      const product = await this.productRepository.findOne({ where: { id: productId } });
      if (product && amount > product.countInStock) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          code: 'insufficient_stock',
          message: `Only ${product.countInStock} items available in stock`,
        });
      }
      item.amount = amount;
      await this.cartItemRepository.save(item);
    }

    const updatedCart = await this.getOrCreateCart(userId);
    return this.buildCartResponse(updatedCart);
  }

  async removeItem(userId: string, productId: string): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId },
    });

    if (!item) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Item not found in cart',
      });
    }

    await this.cartItemRepository.remove(item);

    const updatedCart = await this.getOrCreateCart(userId);
    return this.buildCartResponse(updatedCart);
  }

  private async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: { items: { product: true } },
    });

    if (!cart) {
      cart = this.cartRepository.create({
        id: crypto.randomUUID(),
        userId,
        items: [],
      });
      await this.cartRepository.save(cart);
    }

    return cart;
  }

  private buildCartResponse(cart: Cart): CartResponse {
    const items = (cart.items || []).map((item) => {
      const product = item.product;
      const unavailable = !product || product.deletedAt !== null;
      const price = product?.price ?? 0;
      const discount = product?.discount ?? 0;
      const effectivePrice = price * (1 - discount / 100);

      return {
        productId: item.productId,
        name: product?.name ?? 'Product unavailable',
        image: product?.image ?? '',
        price: Number(price),
        discount,
        amount: item.amount,
        lineTotal: Math.round(effectivePrice * item.amount),
        unavailable,
      };
    });

    return {
      items,
      itemsPrice: items.reduce((sum, i) => sum + i.lineTotal, 0),
      totalQuantity: items.reduce((sum, i) => sum + i.amount, 0),
    };
  }
}

import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

import { CartService } from './cart.service';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Cart contents' })
  async getCart(@Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 200, description: 'Updated cart' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async addItem(@Req() req: Request, @Body() body: { productId: string; amount: number }) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.cartService.addItem(user.id, body.productId, body.amount);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update item quantity (amount=0 removes)' })
  @ApiResponse({ status: 200, description: 'Updated cart' })
  @ApiResponse({ status: 404, description: 'Item not in cart' })
  async updateItem(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Body() body: { amount: number },
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.cartService.updateItem(user.id, productId, body.amount);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Updated cart after removal' })
  @ApiResponse({ status: 404, description: 'Item not in cart' })
  async removeItem(@Req() req: Request, @Param('productId') productId: string) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.cartService.removeItem(user.id, productId);
  }
}

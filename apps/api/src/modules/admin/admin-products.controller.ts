import { Controller, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AdminProductsService } from './admin-products.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin - Products')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(
    @Body()
    body: {
      name: string;
      image: string;
      imageHover: string;
      imageDetail: string;
      categoryId: string;
      price: number;
      countInStock: number;
      discount?: number;
      description: string;
    },
  ) {
    return this.adminProductsService.createProduct(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product + invalidate cache' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async updateProduct(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      image: string;
      imageHover: string;
      imageDetail: string;
      categoryId: string;
      price: number;
      countInStock: number;
      discount: number;
      description: string;
    }>,
  ) {
    return this.adminProductsService.updateProduct(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product (soft if in active orders)' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  async deleteProduct(@Param('id') id: string) {
    return this.adminProductsService.deleteProduct(id);
  }

  @Post('delete-many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete products' })
  @ApiResponse({ status: 200, description: 'Deleted count' })
  async deleteMany(@Body() body: { ids: string[] }) {
    return this.adminProductsService.deleteMany(body.ids);
  }
}

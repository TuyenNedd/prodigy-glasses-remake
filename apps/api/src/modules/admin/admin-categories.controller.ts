import { Controller, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AdminCategoriesService } from './admin-categories.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin - Categories')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly adminCategoriesService: AdminCategoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create category (slug auto-generated)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(@Body() body: { name: string }) {
    return this.adminCategoriesService.createCategory(body.name);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category (slug regenerated)' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(@Param('id') id: string, @Body() body: { name: string }) {
    return this.adminCategoriesService.updateCategory(id, body.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category (fails if has products)' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({ status: 409, description: 'Category has associated products' })
  async deleteCategory(@Param('id') id: string) {
    return this.adminCategoriesService.deleteCategory(id);
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CatalogService } from './catalog.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Catalog')
@Controller('categories')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all categories with product count' })
  @ApiResponse({ status: 200, description: 'Categories list' })
  async getCategories() {
    return this.catalogService.findAllCategories();
  }
}

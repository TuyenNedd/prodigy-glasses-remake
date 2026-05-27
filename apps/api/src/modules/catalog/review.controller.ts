import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

import { ReviewService } from './review.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Reviews')
@Controller('products/:productId/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List reviews for a product' })
  @ApiResponse({ status: 200, description: 'Paginated reviews' })
  async getReviews(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.reviewService.getProductReviews(
      productId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a review (verified purchase required)' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 403, description: 'Purchase required' })
  @ApiResponse({ status: 409, description: 'Already reviewed' })
  async submitReview(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Body() body: { content: string; star: number },
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.reviewService.submitReview(user.id, productId, body.content, body.star);
  }
}

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewDeleteController {
  constructor(private readonly reviewService: ReviewService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a review (owner or admin)' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async deleteReview(@Req() req: Request, @Param('id') id: string) {
    const user = (req as unknown as { user: { id: string; role: string } }).user;
    return this.reviewService.deleteReview(id, user.id, user.role);
  }
}

import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  image: z.string().url().max(2048),
  imageHover: z.string().url().max(2048),
  imageDetail: z.string().url().max(2048),
  categoryId: z.string().uuid(),
  price: z.number().int().min(0),
  countInStock: z.number().int().min(0),
  discount: z.number().int().min(0).max(100).default(0),
  description: z.string().min(1),
});

export const productQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'rating_desc', 'newest']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(100).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;

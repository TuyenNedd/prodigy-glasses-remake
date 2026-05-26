import { Suspense } from 'react';
import { apiFetch } from '@/lib/api-server';
import { ProductCard } from '@/components/public/product-card/product-card';
import { FilterSidebar } from '@/components/public/filter-sidebar/filter-sidebar';
import { Pagination } from '@/components/public/pagination/pagination';

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface Product {
  id: string;
  name: string;
  image: string;
  imageHover: string;
  imageDetail: string;
  price: number;
  discount: number;
  rating: number;
  reviewCount: number;
  category: { id: string; name: string; slug: string };
}

interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Build query string from search params
  const queryParts: string[] = [];
  if (params.categoryId) queryParts.push(`categoryId=${params.categoryId}`);
  if (params.minPrice) queryParts.push(`minPrice=${params.minPrice}`);
  if (params.maxPrice) queryParts.push(`maxPrice=${params.maxPrice}`);
  if (params.minRating) queryParts.push(`minRating=${params.minRating}`);
  if (params.sort) queryParts.push(`sort=${params.sort}`);
  if (params.page) queryParts.push(`page=${params.page}`);
  if (params.pageSize) queryParts.push(`pageSize=${params.pageSize}`);
  if (params.q) queryParts.push(`q=${params.q}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  const [categories, productsRes] = await Promise.all([
    apiFetch<Category[]>('/categories'),
    apiFetch<ProductsResponse>(`/products${queryString}`),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Shop All Eyewear</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <Suspense fallback={<div className="h-96 w-64 animate-pulse rounded bg-gray-100" />}>
          <FilterSidebar categories={categories} />
        </Suspense>

        <main className="flex-1">
          {productsRes.data.length === 0 ? (
            <p className="py-12 text-center text-gray-500">
              No products found. Try adjusting your filters.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-500">
                {productsRes.total} product{productsRes.total !== 1 ? 's' : ''} found
              </p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {productsRes.data.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    image={product.image}
                    imageHover={product.imageHover}
                    price={product.price}
                    discount={product.discount}
                    rating={product.rating}
                    reviewCount={product.reviewCount}
                    category={product.category}
                  />
                ))}
              </div>
              <Pagination currentPage={productsRes.page} totalPages={productsRes.totalPages} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

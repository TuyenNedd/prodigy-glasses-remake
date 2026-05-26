import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AddToCartButton } from '@/components/public/add-to-cart-button/add-to-cart-button';

export const revalidate = 60;

const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:3001/api';

interface Product {
  id: string;
  name: string;
  image: string;
  imageHover: string;
  imageDetail: string;
  price: number;
  discount: number;
  description: string;
  rating: number;
  reviewCount: number;
  countInStock: number;
  category: { id: string; name: string; slug: string };
}

function formatVND(price: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<Product>;
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const discountedPrice =
    product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/products" className="hover:text-black">
          Shop
        </Link>
        {' / '}
        <Link href={`/products?categoryId=${product.category.id}`} className="hover:text-black">
          {product.category.name}
        </Link>
        {' / '}
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={product.image}
              alt={product.name}
              width={600}
              height={600}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={product.imageHover}
                alt={`${product.name} - angle 2`}
                width={300}
                height={300}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={product.imageDetail}
                alt={`${product.name} - detail`}
                width={300}
                height={300}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Product info */}
        <div className="space-y-6">
          <div>
            <Link
              href={`/products?categoryId=${product.category.id}`}
              className="text-sm text-gray-500 hover:text-black"
            >
              {product.category.name}
            </Link>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">{product.name}</h1>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <span className="text-yellow-500">
              {'★'.repeat(Math.round(Number(product.rating)))}
              {'☆'.repeat(5 - Math.round(Number(product.rating)))}
            </span>
            <span className="text-sm text-gray-500">
              {Number(product.rating).toFixed(1)} ({product.reviewCount} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold">{formatVND(discountedPrice)}</span>
            {product.discount > 0 && (
              <>
                <span className="text-lg text-gray-400 line-through">
                  {formatVND(product.price)}
                </span>
                <span className="rounded bg-red-100 px-2 py-0.5 text-sm font-medium text-red-700">
                  -{product.discount}%
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <p className={`text-sm ${product.countInStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {product.countInStock > 0
              ? `In stock (${product.countInStock} available)`
              : 'Out of stock'}
          </p>

          {/* Add to cart */}
          <AddToCartButton productId={product.id} inStock={product.countInStock > 0} />

          {/* Description */}
          <div className="border-t pt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
              Description
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

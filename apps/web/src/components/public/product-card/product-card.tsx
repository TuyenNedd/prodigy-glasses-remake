import Image from 'next/image';
import Link from 'next/link';

interface ProductCardProps {
  id: string;
  name: string;
  image: string;
  imageHover: string;
  price: number;
  discount: number;
  rating: number;
  reviewCount: number;
  category?: { name: string; slug: string };
}

function formatVND(price: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

export function ProductCard({
  id,
  name,
  image,
  imageHover,
  price,
  discount,
  rating,
  category,
}: ProductCardProps) {
  const discountedPrice = discount > 0 ? price * (1 - discount / 100) : price;

  return (
    <Link href={`/products/${id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        <Image
          src={image}
          alt={name}
          width={400}
          height={400}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-0"
          loading="lazy"
        />
        <Image
          src={imageHover}
          alt={`${name} hover`}
          width={400}
          height={400}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          loading="lazy"
        />
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
            -{discount}%
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        {category && <p className="text-xs text-gray-500">{category.name}</p>}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{name}</h3>
        <div className="flex items-center gap-1">
          <span className="text-xs text-yellow-500">{'★'.repeat(Math.round(rating))}</span>
          <span className="text-xs text-gray-400">({rating.toFixed(1)})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{formatVND(discountedPrice)}</span>
          {discount > 0 && (
            <span className="text-xs text-gray-400 line-through">{formatVND(price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

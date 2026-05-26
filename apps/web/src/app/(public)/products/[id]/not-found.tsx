import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <h1 className="mb-2 text-4xl font-bold">404</h1>
      <p className="mb-6 text-gray-600">Product not found</p>
      <Link
        href="/products"
        className="rounded bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Back to Shop
      </Link>
    </div>
  );
}

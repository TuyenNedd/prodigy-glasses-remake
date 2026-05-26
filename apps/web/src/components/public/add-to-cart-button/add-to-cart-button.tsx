'use client';

interface AddToCartButtonProps {
  productId: string;
  inStock: boolean;
}

export function AddToCartButton({ inStock }: AddToCartButtonProps) {
  // Cart functionality will be implemented in Story 3.8
  return (
    <button
      disabled={!inStock}
      className="w-full rounded bg-black py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
    >
      {inStock ? 'Add to Cart' : 'Out of Stock'}
    </button>
  );
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';

import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  discount: number;
  amount: number;
  lineTotal: number;
  unavailable: boolean;
}

interface CartResponse {
  items: CartItem[];
  itemsPrice: number;
  totalQuantity: number;
}

function formatVND(price: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

async function fetchCart(token: string | null): Promise<CartResponse> {
  const res = await fetch(`${API_BASE}/cart`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch cart');
  return res.json() as Promise<CartResponse>;
}

async function updateCartItem(token: string | null, productId: string, amount: number) {
  const res = await fetch(`${API_BASE}/cart/items/${productId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error('Failed to update cart');
  return res.json();
}

async function removeCartItem(token: string | null, productId: string) {
  const res = await fetch(`${API_BASE}/cart/items/${productId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to remove item');
  return res.json();
}

export default function CartPage() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const {
    data: cart,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['cart'],
    queryFn: () => fetchCart(token),
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: ({ productId, amount }: { productId: string; amount: number }) =>
      updateCartItem(token, productId, amount),
    onMutate: async ({ productId, amount }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previous = queryClient.getQueryData<CartResponse>(['cart']);
      queryClient.setQueryData<CartResponse>(['cart'], (old) => {
        if (!old) return old;
        if (amount === 0) {
          const items = old.items.filter((i) => i.productId !== productId);
          return {
            items,
            itemsPrice: items.reduce((s, i) => s + i.lineTotal, 0),
            totalQuantity: items.reduce((s, i) => s + i.amount, 0),
          };
        }
        const items = old.items.map((i) =>
          i.productId === productId
            ? { ...i, amount, lineTotal: (i.lineTotal / i.amount) * amount }
            : i,
        );
        return {
          items,
          itemsPrice: items.reduce((s, i) => s + i.lineTotal, 0),
          totalQuantity: items.reduce((s, i) => s + i.amount, 0),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['cart'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeCartItem(token, productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previous = queryClient.getQueryData<CartResponse>(['cart']);
      queryClient.setQueryData<CartResponse>(['cart'], (old) => {
        if (!old) return old;
        const items = old.items.filter((i) => i.productId !== productId);
        return {
          items,
          itemsPrice: items.reduce((s, i) => s + i.lineTotal, 0),
          totalQuantity: items.reduce((s, i) => s + i.amount, 0),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['cart'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  if (!token) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Your Cart</h1>
        <p className="mb-6 text-gray-600">Please sign in to view your cart.</p>
        <Link
          href="/sign-in"
          className="rounded bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-8 text-2xl font-bold">Your Cart</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-24 w-24 rounded bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-100" />
                <div className="h-4 w-1/4 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-red-600">Failed to load cart. Please try again.</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Your Cart</h1>
        <p className="mb-6 text-gray-600">Your cart is empty.</p>
        <Link
          href="/products"
          className="rounded bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Your Cart ({cart.totalQuantity} items)</h1>

      <div className="space-y-4">
        {cart.items.map((item) => (
          <div
            key={item.productId}
            className={`flex items-center gap-4 rounded-lg border p-4 ${item.unavailable ? 'border-red-200 bg-red-50' : ''}`}
          >
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100">
              <Image
                src={item.image}
                alt={item.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium truncate">{item.name}</h3>
              {item.unavailable && (
                <span className="text-xs text-red-600 font-medium">Unavailable</span>
              )}
              <p className="text-sm text-gray-600">
                {formatVND(item.lineTotal / item.amount)} each
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateMutation.mutate({
                    productId: item.productId,
                    amount: Math.max(0, item.amount - 1),
                  })
                }
                className="h-8 w-8 rounded border text-center hover:bg-gray-50"
                disabled={updateMutation.isPending}
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.amount}</span>
              <button
                onClick={() =>
                  updateMutation.mutate({ productId: item.productId, amount: item.amount + 1 })
                }
                className="h-8 w-8 rounded border text-center hover:bg-gray-50"
                disabled={updateMutation.isPending}
              >
                +
              </button>
            </div>

            <div className="w-24 text-right">
              <p className="text-sm font-semibold">{formatVND(item.lineTotal)}</p>
            </div>

            <button
              onClick={() => removeMutation.mutate(item.productId)}
              className="text-sm text-gray-400 hover:text-red-600"
              disabled={removeMutation.isPending}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 border-t pt-6">
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Subtotal</span>
          <span>{formatVND(cart.itemsPrice)}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">Shipping calculated at checkout</p>
        <Link
          href="/checkout"
          className="mt-4 block w-full rounded bg-black py-3 text-center text-sm font-medium text-white hover:bg-gray-800"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}

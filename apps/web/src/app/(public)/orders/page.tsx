'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Order {
  id: string;
  status: string;
  totalPrice: number;
  paymentMethod: string;
  createdAt: string;
}

interface OrdersResponse {
  data: Order[];
  total: number;
  page: number;
  totalPages: number;
}

function formatVND(price: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    Number(price),
  );
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  AWAITING_PAYMENT: 'bg-orange-100 text-orange-800',
  PAID: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUSES = ['', 'PENDING', 'AWAITING_PAYMENT', 'PAID', 'DELIVERED', 'CANCELLED'];

export default function MyOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-gray-500">Loading...</div>
      }
    >
      <MyOrdersContent />
    </Suspense>
  );
}

function MyOrdersContent() {
  const token = useAuthStore((s) => s.accessToken);
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || '';
  const page = searchParams.get('page') || '1';

  const { data, isLoading } = useQuery({
    queryKey: ['orders', status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('page', page);
      const res = await fetch(`${API_BASE}/orders/me?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json() as Promise<OrdersResponse>;
    },
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-gray-600">Please sign in to view your orders.</p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block rounded bg-black px-6 py-2.5 text-sm font-medium text-white"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My Orders</h1>

      {/* Status tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s ? `/orders?status=${s}` : '/orders'}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${status === s ? 'border-black bg-black text-white' : 'hover:bg-gray-50'}`}
          >
            {s || 'All'}
          </Link>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded border bg-gray-50" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <p className="py-12 text-center text-gray-500">No orders found.</p>
      ) : (
        <div className="space-y-3">
          {data.data.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between rounded border p-4 hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium">#{order.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString()} · {order.paymentMethod}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{formatVND(order.totalPrice)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}
                >
                  {order.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

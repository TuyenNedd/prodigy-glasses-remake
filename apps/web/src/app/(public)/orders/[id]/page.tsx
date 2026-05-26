'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface OrderItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  imageSnapshot: string;
  priceSnapshot: number;
  discountSnapshot: number;
  amount: number;
  lineTotal: number;
}

interface OrderDetail {
  id: string;
  status: string;
  paymentMethod: string;
  deliveryMethod: string;
  shippingAddress: Record<string, string>;
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt: string | null;
  isDelivered: boolean;
  deliveredAt: string | null;
  createdAt: string;
  items: OrderItem[];
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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json() as Promise<OrderDetail>;
    },
    enabled: !!token && !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to cancel order');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.push('/orders');
    },
  });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">Loading...</div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">Order not found.</div>
    );
  }

  const canCancel = ['PENDING', 'AWAITING_PAYMENT'].includes(order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/orders" className="mb-4 inline-block text-sm text-gray-500 hover:text-black">
        ← Back to Orders
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}
        >
          {order.status}
        </span>
      </div>

      <p className="mt-1 text-sm text-gray-500">
        Placed on {new Date(order.createdAt).toLocaleString()} · {order.paymentMethod}
      </p>

      {/* Items */}
      <div className="mt-6 space-y-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 rounded border p-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{item.nameSnapshot}</p>
              <p className="text-xs text-gray-500">
                {formatVND(Number(item.priceSnapshot))} × {item.amount}
              </p>
            </div>
            <p className="text-sm font-semibold">{formatVND(Number(item.lineTotal))}</p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-6 space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span>Items</span>
          <span>{formatVND(order.itemsPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping ({order.deliveryMethod})</span>
          <span>{formatVND(order.shippingPrice)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatVND(order.totalPrice)}</span>
        </div>
      </div>

      {/* Cancel button */}
      {canCancel && (
        <button
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="mt-6 w-full rounded border border-red-300 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
        </button>
      )}
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

export default function AdminOrdersPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/orders`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{
        data: {
          id: string;
          status: string;
          totalPrice: number;
          paymentMethod: string;
          createdAt: string;
        }[];
        total: number;
      }>;
    },
    enabled: !!token,
  });

  if (isLoading) return <p className="text-gray-500">Loading orders...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Orders ({data?.total ?? 0})</h1>
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-gray-500">
          <tr>
            <th className="py-2">Order ID</th>
            <th className="py-2">Status</th>
            <th className="py-2">Total</th>
            <th className="py-2">Payment</th>
            <th className="py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {data?.data?.map((order) => (
            <tr key={order.id} className="border-b">
              <td className="py-2 font-mono text-xs">#{order.id.slice(0, 8)}</td>
              <td className="py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}
                >
                  {order.status}
                </span>
              </td>
              <td className="py-2">{formatVND(order.totalPrice)}</td>
              <td className="py-2 text-gray-500">{order.paymentMethod}</td>
              <td className="py-2 text-gray-500">
                {new Date(order.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

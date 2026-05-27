'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function formatVND(price: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    Number(price),
  );
}

export default function AdminDashboardPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{
        todayOrders: number;
        todayRevenue: number;
        topProducts: { id: string; name: string; selled: number }[];
        lowStockProducts: { id: string; name: string; countInStock: number }[];
      }>;
    },
    enabled: !!token,
  });

  if (isLoading) return <p className="text-gray-500">Loading dashboard...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {/* KPI tiles */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Today&apos;s Orders</p>
          <p className="text-2xl font-bold">{data?.todayOrders ?? 0}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Today&apos;s Revenue</p>
          <p className="text-2xl font-bold">{formatVND(data?.todayRevenue ?? 0)}</p>
        </div>
      </div>

      {/* Top products */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase text-gray-700">Top Products</h2>
        <div className="space-y-2">
          {data?.topProducts?.map((p) => (
            <div key={p.id} className="flex justify-between rounded border px-3 py-2 text-sm">
              <span>{p.name}</span>
              <span className="text-gray-500">{p.selled} sold</span>
            </div>
          ))}
        </div>
      </div>

      {/* Low stock */}
      {data?.lowStockProducts && data.lowStockProducts.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase text-red-600">Low Stock Alert</h2>
          <div className="space-y-2">
            {data.lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="flex justify-between rounded border border-red-200 bg-red-50 px-3 py-2 text-sm"
              >
                <span>{p.name}</span>
                <span className="font-medium text-red-600">{p.countInStock} left</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

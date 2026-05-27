'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function formatVND(price: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    Number(price),
  );
}

export default function AdminProductsPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/products?pageSize=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{
        data: {
          id: string;
          name: string;
          price: number;
          countInStock: number;
          discount: number;
          category: { name: string };
        }[];
        total: number;
      }>;
    },
    enabled: !!token,
  });

  if (isLoading) return <p className="text-gray-500">Loading products...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Products ({data?.total ?? 0})</h1>
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-gray-500">
          <tr>
            <th className="py-2">Name</th>
            <th className="py-2">Category</th>
            <th className="py-2">Price</th>
            <th className="py-2">Stock</th>
            <th className="py-2">Discount</th>
          </tr>
        </thead>
        <tbody>
          {data?.data?.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2 font-medium">{p.name}</td>
              <td className="py-2 text-gray-500">{p.category?.name}</td>
              <td className="py-2">{formatVND(p.price)}</td>
              <td
                className={`py-2 ${Number(p.countInStock) < 5 ? 'text-red-600 font-medium' : ''}`}
              >
                {p.countInStock}
              </td>
              <td className="py-2">{p.discount > 0 ? `${p.discount}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

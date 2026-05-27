'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function AdminCategoriesPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/categories`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<
        { id: string; name: string; slug: string; productCount: number }[]
      >;
    },
    enabled: !!token,
  });

  if (isLoading) return <p className="text-gray-500">Loading categories...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Categories</h1>
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-gray-500">
          <tr>
            <th className="py-2">Name</th>
            <th className="py-2">Slug</th>
            <th className="py-2">Products</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((cat) => (
            <tr key={cat.id} className="border-b">
              <td className="py-2 font-medium">{cat.name}</td>
              <td className="py-2 text-gray-500">{cat.slug}</td>
              <td className="py-2">{cat.productCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

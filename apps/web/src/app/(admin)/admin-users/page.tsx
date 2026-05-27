'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{
        data: { id: string; email: string; name: string; role: string; createdAt: string }[];
        total: number;
      }>;
    },
    enabled: !!token,
  });

  if (isLoading) return <p className="text-gray-500">Loading users...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users ({data?.total ?? 0})</h1>
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-gray-500">
          <tr>
            <th className="py-2">Email</th>
            <th className="py-2">Name</th>
            <th className="py-2">Role</th>
            <th className="py-2">Joined</th>
          </tr>
        </thead>
        <tbody>
          {data?.data?.map((user) => (
            <tr key={user.id} className="border-b">
              <td className="py-2">{user.email}</td>
              <td className="py-2">{user.name}</td>
              <td className="py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}
                >
                  {user.role}
                </span>
              </td>
              <td className="py-2 text-gray-500">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

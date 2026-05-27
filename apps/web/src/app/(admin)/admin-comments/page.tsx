'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function AdminCommentsPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-comments'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/comments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{
        data: {
          id: string;
          content: string;
          star: number;
          userId: string;
          productId: string;
          createdAt: string;
        }[];
        total: number;
      }>;
    },
    enabled: !!token,
  });

  if (isLoading) return <p className="text-gray-500">Loading comments...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Comments ({data?.total ?? 0})</h1>
      <div className="space-y-3">
        {data?.data?.map((comment) => (
          <div key={comment.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="text-yellow-500">{'★'.repeat(comment.star)}</span>
              <span className="text-xs text-gray-400">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-1 text-sm">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

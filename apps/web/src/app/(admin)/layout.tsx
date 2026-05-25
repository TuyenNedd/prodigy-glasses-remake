'use client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // TODO: Auth guard + Socket.IO bootstrap (Story 4.8)
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-gray-50 p-4">
        <h2 className="mb-4 text-lg font-bold">Admin Panel</h2>
        <nav className="flex flex-col gap-2">
          <a href="/dashboard" className="hover:underline">
            Dashboard
          </a>
          <a href="/products" className="hover:underline">
            Sản phẩm
          </a>
          <a href="/orders" className="hover:underline">
            Đơn hàng
          </a>
          <a href="/users" className="hover:underline">
            Người dùng
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

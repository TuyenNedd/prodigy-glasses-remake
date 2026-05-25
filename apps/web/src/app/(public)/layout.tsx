export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="text-xl font-bold">
            Prodigy Glasses
          </a>
          <div className="flex gap-4">
            <a href="/products" className="hover:underline">
              Sản phẩm
            </a>
            <a href="/sign-in" className="hover:underline">
              Đăng nhập
            </a>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      <footer className="border-t px-6 py-4 text-center text-sm text-gray-500">
        © 2026 Prodigy Glasses. Portfolio project by Jarvis.
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-20">
      <h1 className="text-4xl font-bold">Prodigy Glasses</h1>
      <p className="max-w-lg text-center text-lg text-gray-600">
        Cửa hàng kính mắt trực tuyến — Chất lượng cao, giá hợp lý.
      </p>
      <a
        href="/products"
        className="rounded-lg bg-black px-6 py-3 text-white transition hover:bg-gray-800"
      >
        Xem sản phẩm
      </a>
    </div>
  );
}

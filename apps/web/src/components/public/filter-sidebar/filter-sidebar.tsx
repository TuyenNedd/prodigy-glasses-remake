'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface FilterSidebarProps {
  categories: Category[];
}

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating_desc', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
];

export function FilterSidebar({ categories }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('categoryId') || '';
  const currentSort = searchParams.get('sort') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      // Reset to page 1 on filter change
      params.delete('page');
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <aside className="w-full space-y-6 lg:w-64">
      {/* Category filter */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
          Category
        </h3>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => updateParams({ categoryId: '' })}
              className={`block w-full text-left text-sm ${!currentCategory ? 'font-semibold text-black' : 'text-gray-600 hover:text-black'}`}
            >
              All ({categories.reduce((sum, c) => sum + c.productCount, 0)})
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => updateParams({ categoryId: cat.id })}
                className={`block w-full text-left text-sm ${currentCategory === cat.id ? 'font-semibold text-black' : 'text-gray-600 hover:text-black'}`}
              >
                {cat.name} ({cat.productCount})
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Price range */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
          Price Range
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            defaultValue={currentMinPrice}
            onBlur={(e) =>
              updateParams({ minPrice: String((e.target as unknown as { value: string }).value) })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            placeholder="Max"
            defaultValue={currentMaxPrice}
            onBlur={(e) =>
              updateParams({ maxPrice: String((e.target as unknown as { value: string }).value) })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Sort */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
          Sort By
        </h3>
        <select
          value={currentSort}
          onChange={(e) =>
            updateParams({ sort: String((e.target as unknown as { value: string }).value) })
          }
          className="w-full rounded border px-2 py-1.5 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}

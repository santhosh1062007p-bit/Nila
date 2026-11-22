'use client';

import React from 'react';
import { Category } from '@/types';

interface ProductFiltersProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categorySlug: string) => void;
  egglessOnly: boolean;
  onToggleEgglessOnly: (val: boolean) => void;
}

export default function ProductFilters({
  categories,
  selectedCategory,
  onSelectCategory,
  egglessOnly,
  onToggleEgglessOnly,
}: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 py-2 border-b border-[#F5D3DC] w-full">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold w-full sm:w-auto min-w-0 pb-1 sm:pb-0">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-4 py-2 rounded-full transition-all ${
            selectedCategory === 'all'
              ? 'bg-[#8F1237] text-white shadow-sm'
              : 'bg-white text-[#70132C] border border-[#F5D3DC] hover:border-[#8F1237]'
          }`}
        >
          All Cakes (30)
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.slug)}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap ${
              selectedCategory === cat.slug
                ? 'bg-[#8F1237] text-white shadow-sm'
                : 'bg-white text-[#70132C] border border-[#F5D3DC] hover:border-[#8F1237]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Eggless Quick Toggle */}
      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#70132C] bg-white px-3.5 py-2 rounded-full border border-[#F5D3DC] hover:border-[#8F1237]">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
        <span>100% Eggless Only (+₹200)</span>
        <input
          type="checkbox"
          checked={egglessOnly}
          onChange={(e) => onToggleEgglessOnly(e.target.checked)}
          className="w-4 h-4 text-[#8F1237] rounded border-[#F5D3DC] accent-[#8F1237]"
        />
      </label>
    </div>
  );
}

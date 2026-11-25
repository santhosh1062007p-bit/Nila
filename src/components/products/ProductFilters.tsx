'use client';

import React from 'react';
import { Category } from '@/types';
import {
  Flame,
  IndianRupee,
  Sparkles,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';

interface ProductFiltersProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categorySlug: string) => void;
  egglessOnly: boolean;
  onToggleEgglessOnly: (val: boolean) => void;
  quickFilter: string;
  onSelectQuickFilter: (filter: string) => void;
  sortBy: string;
  onSelectSortBy: (sort: string) => void;
  totalCount: number;
}

const SORT_OPTIONS: { id: string; label: string }[] = [
  { id: 'featured', label: 'Featured & Popular' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
  { id: 'rating', label: 'Customer Rating' },
];

export default function ProductFilters({
  categories,
  selectedCategory,
  onSelectCategory,
  egglessOnly,
  onToggleEgglessOnly,
  quickFilter,
  onSelectQuickFilter,
  sortBy,
  onSelectSortBy,
  totalCount,
}: ProductFiltersProps) {
  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.id === sortBy)?.label || 'Featured & Popular';

  return (
    <div className="space-y-3 py-2 border-b border-[#F5D3DC] w-full">
      {/* Category Pills & Sort Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
        {/* Category Pills (Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold pb-1 sm:pb-0 min-w-0 flex-1">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#8F1237] text-white shadow-xs'
                : 'bg-white text-[#70132C] border border-[#F5D3DC] hover:border-[#8F1237]'
            }`}
          >
            All Cakes ({totalCount})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`px-4 py-2 rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat.slug
                  ? 'bg-[#8F1237] text-white shadow-xs'
                  : 'bg-white text-[#70132C] border border-[#F5D3DC] hover:border-[#8F1237]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Premium Native-Interactive Sort Pill (Never clipped by overflow, Zero Emojis) */}
        <div className="relative shrink-0 self-end sm:self-auto">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-full border border-[#F5D3DC] hover:border-[#8F1237] text-xs font-semibold shadow-xs cursor-pointer transition-all group">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#8F1237] pointer-events-none" />
            <span className="text-[11px] text-stone-500 font-medium pointer-events-none">Sort:</span>
            <span className="font-bold text-[#70132C] pointer-events-none">{currentSortLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8F1237] pointer-events-none group-hover:translate-y-0.5 transition-transform" />

            <select
              value={sortBy}
              onChange={(e) => onSelectSortBy(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Sort cakes by"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="text-stone-800 bg-white font-medium">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick Filter Badges (Clean Lucide SVG Icons, Zero Emojis) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
        {/* Bestsellers Quick Filter */}
        <button
          onClick={() =>
            onSelectQuickFilter(quickFilter === 'bestsellers' ? 'all' : 'bestsellers')
          }
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap cursor-pointer ${
            quickFilter === 'bestsellers'
              ? 'bg-[#8F1237] text-white border-[#8F1237] shadow-xs'
              : 'bg-white text-[#70132C] border-[#F5D3DC] hover:border-[#8F1237]'
          }`}
        >
          <Flame
            className={`w-3.5 h-3.5 ${
              quickFilter === 'bestsellers' ? 'text-amber-300' : 'text-amber-500'
            }`}
          />
          <span>Bestsellers</span>
        </button>

        {/* Under ₹500 Quick Filter */}
        <button
          onClick={() =>
            onSelectQuickFilter(quickFilter === 'under500' ? 'all' : 'under500')
          }
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap cursor-pointer ${
            quickFilter === 'under500'
              ? 'bg-[#8F1237] text-white border-[#8F1237] shadow-xs'
              : 'bg-white text-[#70132C] border-[#F5D3DC] hover:border-[#8F1237]'
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" />
          <span>Under ₹500</span>
        </button>

        {/* 100% Eggless Only Toggle */}
        <button
          onClick={() => onToggleEgglessOnly(!egglessOnly)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap cursor-pointer ${
            egglessOnly
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
              : 'bg-white text-emerald-800 border-emerald-300 hover:border-emerald-600'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>
          <span>100% Eggless Pure Veg</span>
        </button>

        {/* Fruit Cakes Quick Filter */}
        <button
          onClick={() =>
            onSelectQuickFilter(quickFilter === 'fruit' ? 'all' : 'fruit')
          }
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap cursor-pointer ${
            quickFilter === 'fruit'
              ? 'bg-[#8F1237] text-white border-[#8F1237] shadow-xs'
              : 'bg-white text-[#70132C] border-[#F5D3DC] hover:border-[#8F1237]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Fresh Fruit Cakes</span>
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Search, User as UserIcon, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/utils';
import { INITIAL_PRODUCTS } from '@/data/initial-data';
import CakeImage from '@/components/products/CakeImage';

function getInitials(name?: string | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export default function Navbar() {
  const router = useRouter();
  const { totalItemsCount, subtotalPaise, setIsCartOpen } = useCart();
  const { user, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const previewResults = searchQuery.trim()
    ? INITIAL_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          p.category_name?.toLowerCase().includes(searchQuery.toLowerCase().trim())
      ).slice(0, 5)
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchFocused(false);
    if (searchQuery.trim()) {
      router.push(`/cakes?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/cakes');
    }
  };

  const initials = getInitials(user?.full_name);

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#F5D3DC] shadow-sm">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between py-2.5 md:py-0 md:h-20 gap-2.5 sm:gap-4">
          {/* Web Name & Logo */}
          <Link href="/cakes" className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-[#8F1237]/20 shadow-sm bg-[#FFF6F0]">
              <Image
                src="/images/nilas-badge.png"
                alt="Nila's Treat"
                fill
                priority
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-serif text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-[#8F1237] block leading-none">
                Nila&apos;s Treat
              </span>
              <span className="text-[9px] sm:text-[10px] md:text-xs font-medium tracking-wider uppercase text-[#70132C]/70 block mt-0.5 sm:mt-1">
                The Home of Fresh Baking
              </span>
            </div>
          </Link>

          {/* Instant Search Bar with Live Preview */}
          <div className="order-3 w-full md:order-none md:flex-1 md:max-w-xl lg:max-w-2xl relative">
            <form onSubmit={handleSearchSubmit} className="flex items-center relative">
              <input
                type="text"
                placeholder="Search freshly baked cakes (e.g. Pista, Truffle, Kunafa)..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FFFDFB] pl-10 pr-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm border border-[#F5D3DC] focus:outline-none focus:border-[#8F1237] focus:ring-1 focus:ring-[#8F1237] text-[#33252A] placeholder:text-[#70132C]/50"
              />
              <Search className="w-4 h-4 text-[#70132C]/60 absolute left-3.5 top-2.5 sm:top-3" />
            </form>

            {/* Instant Floating Preview Dropdown */}
            {isSearchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#F5D3DC] shadow-2xl p-2 z-50 divide-y divide-[#F5D3DC]/60 max-h-96 overflow-y-auto">
                {previewResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-500">
                    No cakes found matching &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-[#8C485A] uppercase tracking-wider">
                      Matching Cakes ({previewResults.length})
                    </div>
                    {previewResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSearchQuery(p.name);
                          setIsSearchFocused(false);
                          router.push(`/cakes?search=${encodeURIComponent(p.name)}`);
                        }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-[#FFF6F0] rounded-xl text-left transition-colors group cursor-pointer"
                      >
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-[#F5D3DC]">
                          <CakeImage src={p.image_url} alt={p.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-[#70132C] group-hover:text-[#8F1237] truncate">
                              {p.name}
                            </span>
                            {p.is_eggless_available && (
                              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block shrink-0" title="Eggless Available" />
                            )}
                          </div>
                          <span className="text-[10px] text-stone-500 block truncate">
                            {p.category_name}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[#8F1237] shrink-0">
                          From {formatINR(p.variants[0]?.price_paise || 30000)}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchFocused(false);
                        router.push(`/cakes?search=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                      className="w-full py-2 text-center text-xs font-bold text-[#8F1237] hover:underline flex items-center justify-center gap-1 pt-2.5 cursor-pointer"
                    >
                      <span>View all results for &ldquo;{searchQuery}&rdquo;</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Cart & Profile Avatar / Sign In */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Open shopping cart"
              className="flex items-center gap-2 py-2 px-3.5 sm:px-4 rounded-full bg-[#8F1237] text-white hover:bg-[#750E2D] shadow-sm transition-all text-xs sm:text-sm font-bold active:scale-95"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-400 text-[#8F1237] font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItemsCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">
                {subtotalPaise > 0 ? formatINR(subtotalPaise) : 'Cart'}
              </span>
            </button>

            {isLoading ? (
              <div
                aria-hidden="true"
                className="w-10 h-10 rounded-full bg-[#FCE8ED] animate-pulse border border-[#F5D3DC]"
              />
            ) : user ? (
              <Link
                href="/account"
                aria-label="My Account and Profile"
                title="My Account"
                className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 sm:pr-3.5 bg-[#FFF6F0] hover:bg-[#FCE8ED] border border-[#F5D3DC] hover:border-[#8F1237]/40 shadow-xs hover:shadow-md transition-all duration-200 active:scale-95"
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#8F1237] to-[#630B25] text-white flex items-center justify-center font-serif font-bold text-xs shadow-sm ring-2 ring-white group-hover:scale-105 transition-transform duration-200 shrink-0">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || 'User profile avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : initials ? (
                    <span>{initials}</span>
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                </div>

                <div className="hidden sm:block text-left pr-0.5">
                  <span className="block text-xs font-bold text-[#70132C] leading-none truncate max-w-[115px]">
                    {user.full_name}
                  </span>
                  <span className="block text-[10px] text-[#8C485A] leading-none mt-1">
                    My Account
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/login"
                  className="py-2 px-3.5 sm:px-4 rounded-full bg-[#FFF6F0] border border-[#F5D3DC] text-[#8F1237] hover:bg-[#8F1237] hover:text-white text-xs font-bold transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex py-2 px-4 rounded-full border border-[#8F1237] text-[#8F1237] hover:bg-[#8F1237] hover:text-white text-xs font-bold transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

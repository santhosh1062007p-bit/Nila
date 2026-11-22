'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Cake,
  ShoppingBag,
  MapPin,
  Tag,
  LogOut,
  ExternalLink,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';

export default function AdminNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { isLive } = useRealtime();

  const links = [
    { href: '/admin/orders', label: 'Live Orders', icon: ShoppingBag },
    { href: '/admin/logins', label: 'Customer Logins', icon: Users },
    { href: '/admin/products', label: 'Cakes & Pricing', icon: Cake },
    { href: '/admin/dashboard', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/delivery', label: 'Delivery Zones', icon: MapPin },
    { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  ];

  return (
    <div className="w-full bg-[#70132C] text-white py-3 px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 border-b border-[#8C1B3B] md:sticky md:top-20 z-30 shadow-md">
      <div className="w-full flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          <span className="font-serif font-black text-sm text-[#FCE8ED] whitespace-nowrap bg-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <span>OWNER DESK</span>
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
              title={isLive ? 'Real-Time Sync Connected' : 'Connecting to Real-Time Sync'}
            />
          </span>
          <div className="flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white text-[#990F35] shadow-xs'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs">
          <Link
            href="/"
            className="flex items-center gap-1 text-white/80 hover:text-white"
            target="_blank"
          >
            <span>Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="flex items-center gap-1 text-[#FCE8ED] hover:text-white font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}


'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import CartDrawer from '@/components/cart/CartDrawer';

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/register';

  if (isAuthPage) {
    return (
      <main className="min-h-screen flex flex-col justify-center bg-[#FFFDFC]">
        {children}
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <CartDrawer />
    </>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { RealtimeProvider } from '@/context/RealtimeContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import SiteShell from '@/components/layout/SiteShell';
import WebVitalsReporter from '@/components/perf/WebVitalsReporter';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "Nila's Treat — The Home of Fresh Baking | Theni, Tamil Nadu",
  description:
    'Handcrafted premium celebration cakes, birthday cakes, rich chocolate truffle, and fruit cakes baked fresh in Theni, Tamil Nadu.',
  keywords: [
    "Nila's Treat",
    'Theni Bakery',
    'Cakes Theni',
    'Birthday Cake Delivery Theni',
    'Eggless Cakes Theni',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#FFFDFB] text-[#70132C]">
        <ToastProvider>
          <RealtimeProvider>
            <AuthProvider>
              <CartProvider>
                <WebVitalsReporter />
                <SiteShell>{children}</SiteShell>
              </CartProvider>
            </AuthProvider>
          </RealtimeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

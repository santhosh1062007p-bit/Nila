import { redirect } from 'next/navigation';
import { getCurrentUserFromCookie } from '@/lib/auth/jwt';

export default async function HomePage() {
  const user = await getCurrentUserFromCookie();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'admin') {
    redirect('/admin/products');
  }

  redirect('/cakes');
}

import { NextResponse } from 'next/server';
import { getCurrentUserFromCookie } from '@/lib/auth/jwt';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const payload = await getCurrentUserFromCookie();
    if (!payload) {
      return NextResponse.json(
        { user: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (payload.role === 'admin') {
      const admin = await db.getAdminUserById(payload.userId);
      return NextResponse.json(
        {
          user: {
            id: payload.userId,
            full_name: admin?.full_name || payload.fullName,
            phone: admin?.phone || payload.phone,
            email: admin?.email || payload.email,
            role: 'admin',
            is_active: true,
            mfa_enabled: Boolean(admin?.mfa_enabled),
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const user = await db.getUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        {
          user: {
            id: payload.userId,
            full_name: payload.fullName,
            phone: payload.phone,
            email: payload.email,
            role: payload.role,
            is_active: true,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { password: _p, password_hash: _ph, ...safeUser } = user;
    return NextResponse.json(
      { user: safeUser },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { user: null },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

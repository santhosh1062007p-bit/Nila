import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUserFromCookie } from '@/lib/auth/jwt';

export async function GET() {
  try {
    const user = await getCurrentUserFromCookie();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const logins = await db.getCustomerLogins();
    const allUsers = await db.getUsers();
    const allOrders = await db.getOrders();

    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9344597833';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@nilastreat.com';

    // Strictly Customers Only — exclude admin from customer lists
    const customerLogins = logins.filter(
      (l) => l.user_id !== 'usr-admin-1' && l.phone !== adminPhone && l.email !== adminEmail
    );

    const customerUsers = allUsers
      .filter((u) => u.role === 'customer' && u.phone !== adminPhone && u.email !== adminEmail)
      .map((cust) => {
        const custCleanPhone = cust.phone.replace(/[^0-9]/g, '');
        const custOrders = allOrders.filter(
          (o) => o.customer_phone.replace(/[^0-9]/g, '') === custCleanPhone
        );
        const totalSpent = custOrders.reduce((sum, o) => sum + o.total_paise, 0);
        const latestLogin = logins.find(
          (l) => l.phone.replace(/[^0-9]/g, '') === custCleanPhone
        );

        return {
          id: cust.id,
          full_name: cust.full_name,
          phone: cust.phone,
          email: cust.email,
          created_at: cust.created_at,
          orders_count: custOrders.length,
          total_spent_paise: totalSpent,
          last_active: latestLogin ? latestLogin.login_time : cust.created_at,
          is_verified: true,
          recent_orders: custOrders.slice(0, 5).map((o) => ({
            id: o.id,
            order_code: o.order_code,
            created_at: o.created_at,
            order_status: o.order_status,
            total_paise: o.total_paise,
            items_summary: o.items.map((it) => `${it.product_name} (${it.weight_kg}kg)`).join(', '),
          })),
        };
      });

    return NextResponse.json({
      logins: customerLogins,
      customers: customerUsers,
      total_customers: customerUsers.length,
      total_logins: customerLogins.length,
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch customer logins', error: String(error) },
      { status: 500 }
    );
  }
}

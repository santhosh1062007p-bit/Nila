import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [products, categories] = await Promise.all([
      db.getProducts(),
      db.getCategories(),
    ]);

    return NextResponse.json({ products, categories });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to retrieve product catalogue', error: String(error) },
      { status: 500 }
    );
  }
}


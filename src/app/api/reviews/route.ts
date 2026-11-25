import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { Review } from '@/types';

const reviewSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  product_name: z.string().optional(),
  customer_name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, 'Review comment must be at least 5 characters').max(1000),
  order_id: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('product_id') || undefined;
    const reviews = await db.getReviews(productId);
    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimitErr = enforceRateLimit(req, 'submit-review', 10, 60_000);
  if (rateLimitErr) return rateLimitErr;

  try {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || 'Invalid review payload' },
        { status: 400 }
      );
    }

    const newReview: Review = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      product_id: parsed.data.product_id,
      product_name: parsed.data.product_name,
      customer_name: parsed.data.customer_name.trim(),
      rating: parsed.data.rating,
      comment: parsed.data.comment.trim(),
      order_id: parsed.data.order_id,
      created_at: new Date().toISOString(),
    };

    const saved = await db.saveReview(newReview);
    return NextResponse.json({ success: true, review: saved }, { status: 201 });
  } catch (error) {
    console.error('Error saving review:', error);
    return NextResponse.json({ success: false, message: 'Failed to submit review' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { BAKERY_COORDINATES } from '@/data/initial-data';

// Helper function to calculate Haversine distance between two coordinates in kilometers
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // rounded to 2 decimal places
}

export async function POST(req: NextRequest) {
  try {
    const csrfError = verifySameOriginCsrf(req);
    if (csrfError) return csrfError;

    const body = await req.json();
    const { order_id, partner_id, lat, lng, accuracy, speed, heading, customer_lat, customer_lng } = body;

    if (!order_id || !partner_id || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { message: 'Invalid payload: order_id, partner_id, lat, and lng are required.' },
        { status: 400 }
      );
    }

    // Determine target customer coordinate (or fallback to Theni Town center if not provided)
    const destLat = typeof customer_lat === 'number' ? customer_lat : 10.0125;
    const destLng = typeof customer_lng === 'number' ? customer_lng : 77.4780;

    const distanceRemainingKm = calculateHaversineKm(lat, lng, destLat, destLng);
    // Average delivery bike speed in Theni: 22 km/h
    const etaMinutes = Math.max(1, Math.round((distanceRemainingKm / 22) * 60));

    const updatedOrder = await db.updateDeliveryLocation(order_id, partner_id, {
      lat,
      lng,
      accuracy: accuracy || null,
      speed: speed || null,
      heading: heading || null,
      distance_remaining_km: distanceRemainingKm,
      eta_minutes: etaMinutes,
    });

    if (!updatedOrder) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order_id,
      partner_id,
      lat,
      lng,
      distance_remaining_km: distanceRemainingKm,
      eta_minutes: etaMinutes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Delivery Location API] Error updating GPS position:', error);
    return NextResponse.json({ message: 'Internal server error updating location.' }, { status: 500 });
  }
}

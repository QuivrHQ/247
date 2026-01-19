import { NextResponse } from 'next/server';

/**
 * GET /api/push/vapid-key
 * Get the VAPID public key for push subscription
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID key not configured' }, { status: 500 });
  }

  return NextResponse.json({ publicKey });
}

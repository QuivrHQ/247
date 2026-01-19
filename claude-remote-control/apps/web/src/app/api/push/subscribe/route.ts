import { NextResponse } from 'next/server';
import { db, pushSubscription } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications (requires authentication)
 */
export async function POST(req: Request) {
  try {
    const { neonAuth } = await import('@neondatabase/auth/next/server');
    const { user } = await neonAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subscription, userAgent } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const id = crypto.randomUUID();

    // Upsert subscription (update if endpoint already exists)
    const [result] = await db
      .insert(pushSubscription)
      .values({
        id,
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent || req.headers.get('user-agent'),
      })
      .onConflictDoUpdate({
        target: pushSubscription.endpoint,
        set: {
          userId: user.id,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: userAgent || req.headers.get('user-agent'),
        },
      })
      .returning();

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('[Push] Error subscribing:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 * Unsubscribe from push notifications
 */
export async function DELETE(req: Request) {
  try {
    const { neonAuth } = await import('@neondatabase/auth/next/server');
    const { user } = await neonAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, endpoint));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Push] Error unsubscribing:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

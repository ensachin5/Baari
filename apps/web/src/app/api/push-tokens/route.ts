import { NextResponse } from 'next/server';
import { db, pushTokens } from '@baari/db';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  try {
    const { token, deviceType } = await req.json();
    if (!token || !deviceType) {
      return NextResponse.json({ error: 'token and deviceType are required' }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, userSession.id), eq(pushTokens.token, token)));

    if (!existing) {
      await db.insert(pushTokens).values({
        userId: userSession.id,
        token,
        deviceType: deviceType || 'web',
      });
    }

    return NextResponse.json({ message: 'Push token registered successfully' });
  } catch (err: any) {
    console.error('[Push Token Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to register push token' }, { status: 500 });
  }
}

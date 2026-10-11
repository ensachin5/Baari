import { NextResponse } from 'next/server';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';
import { calculateUserStreak } from '@/lib/services/streaks';

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || user.id;

  const streaks = await calculateUserStreak(userId);
  return NextResponse.json(streaks);
}

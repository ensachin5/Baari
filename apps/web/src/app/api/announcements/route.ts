import { NextResponse } from 'next/server';
import { db, announcements, flatMembers, user } from '@baari/db';
import { eq, and, desc } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { createAnnouncementSchema } from '@baari/shared';

export async function GET(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const flatId = searchParams.get('flatId');
  if (!flatId) {
    return NextResponse.json({ error: 'flatId query param is required' }, { status: 400 });
  }

  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('Not a member of this flat');
  }

  const items = await db
    .select({
      id: announcements.id,
      flatId: announcements.flatId,
      postedBy: announcements.postedBy,
      title: announcements.title,
      body: announcements.body,
      pinned: announcements.pinned,
      createdAt: announcements.createdAt,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(announcements)
    .innerJoin(user, eq(announcements.postedBy, user.id))
    .where(eq(announcements.flatId, flatId))
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
    .limit(20);

  return NextResponse.json({ announcements: items });
}

export async function POST(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  try {
    const json = await req.json();
    const parsed = createAnnouncementSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { flatId, title, body, pinned } = parsed.data;

    const [membership] = await db
      .select()
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

    if (!membership) {
      return forbiddenResponse('Not a member of this flat');
    }

    const [newAnnouncement] = await db
      .insert(announcements)
      .values({
        flatId,
        postedBy: userSession.id,
        title,
        body,
        pinned: pinned ?? true,
      })
      .returning();

    return NextResponse.json({ announcement: newAnnouncement }, { status: 201 });
  } catch (err: any) {
    console.error('[Create Announcement Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to create announcement' }, { status: 500 });
  }
}

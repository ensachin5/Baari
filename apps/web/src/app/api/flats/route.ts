import { NextResponse } from 'next/server';
import { db, flats, flatMembers, quickPickPresets, activityLog } from '@baari/db';
import { createFlatSchema, DEFAULT_QUICK_PICKS } from '@baari/shared';
import { eq } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = createFlatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { name, type = 'flat' } = parsed.data;

    let inviteCode = generateInviteCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const existing = await db.select({ id: flats.id }).from(flats).where(eq(flats.inviteCode, inviteCode));
      if (existing.length === 0) {
        isUnique = true;
      } else {
        inviteCode = generateInviteCode();
        attempts++;
      }
    }

    const [newFlat] = await db
      .insert(flats)
      .values({
        name,
        type: type || 'flat',
        inviteCode,
        createdBy: user.id,
      })
      .returning();

    await db.insert(flatMembers).values({
      flatId: newFlat.id,
      userId: user.id,
      role: 'admin',
    });

    await db.insert(quickPickPresets).values(
      DEFAULT_QUICK_PICKS.map((p) => ({
        flatId: newFlat.id,
        label: p.label,
        title: p.title,
        category: p.category,
        sortOrder: p.sortOrder,
      }))
    );

    await db.insert(activityLog).values({
      flatId: newFlat.id,
      actorId: user.id,
      type: 'member_joined',
      referenceId: newFlat.id,
      metadata: { flatName: newFlat.name, role: 'admin' },
    });

    return NextResponse.json({ flat: { ...newFlat, role: 'admin', memberCount: 1 } }, { status: 201 });
  } catch (err: any) {
    console.error('[Create Flat Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to create flat' }, { status: 500 });
  }
}

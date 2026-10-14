import { NextResponse } from 'next/server';
import { db, quickPickPresets, flatMembers } from '@baari/db';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { updateQuickPickSchema } from '@baari/shared';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: presetId } = await params;
  const json = await req.json();
  const parsed = updateQuickPickSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(quickPickPresets)
    .where(eq(quickPickPresets.id, presetId));

  if (!existing) {
    return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, existing.flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('Not a member of this flat');
  }

  const { label, title, category, icon, sortOrder } = parsed.data;
  const updatePayload: any = {};
  if (label !== undefined) updatePayload.label = label;
  if (title !== undefined) updatePayload.title = title;
  if (category !== undefined) updatePayload.category = category;
  if (icon !== undefined) updatePayload.icon = icon;
  if (sortOrder !== undefined) updatePayload.sortOrder = sortOrder;

  const [updatedPreset] = await db
    .update(quickPickPresets)
    .set(updatePayload)
    .where(eq(quickPickPresets.id, presetId))
    .returning();

  return NextResponse.json({ preset: updatedPreset });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: presetId } = await params;

  const [existing] = await db
    .select()
    .from(quickPickPresets)
    .where(eq(quickPickPresets.id, presetId));

  if (!existing) {
    return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, existing.flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('Not a member of this flat');
  }

  await db.delete(quickPickPresets).where(eq(quickPickPresets.id, presetId));

  return NextResponse.json({ success: true, message: 'Preset deleted' });
}

import { NextResponse } from 'next/server';
import { db, groceryItems, flatMembers, user } from '@baari/db';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: itemId } = await params;
  const body = await req.json().catch(() => ({}));
  const { bought = true } = body;

  const [item] = await db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.id, itemId));

  if (!item) {
    return NextResponse.json({ error: 'Grocery item not found' }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, item.flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('You are not a member of this flat');
  }

  const newStatus = bought ? 'bought' : 'needed';
  const newBoughtBy = bought ? userSession.id : null;
  const newBoughtAt = bought ? new Date() : null;

  const [updated] = await db
    .update(groceryItems)
    .set({
      status: newStatus,
      boughtBy: newBoughtBy,
      boughtAt: newBoughtAt,
    })
    .where(eq(groceryItems.id, itemId))
    .returning();

  const [adder] = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, updated.addedBy));

  let buyerName: string | null = null;
  let buyerImage: string | null = null;

  if (updated.boughtBy) {
    const [buyer] = await db
      .select({ name: user.name, image: user.image })
      .from(user)
      .where(eq(user.id, updated.boughtBy));
    buyerName = buyer?.name || null;
    buyerImage = buyer?.image || null;
  }

  const result = {
    ...updated,
    addedByName: adder?.name || null,
    addedByImage: adder?.image || null,
    boughtByName: buyerName,
    boughtByImage: buyerImage,
  };

  return NextResponse.json({ item: result });
}

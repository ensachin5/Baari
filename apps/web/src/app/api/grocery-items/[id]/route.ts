import { NextResponse } from 'next/server';
import { db, groceryItems, flatMembers } from '@baari/db';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: itemId } = await params;

  const [item] = await db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.id, itemId));

  if (!item) {
    return NextResponse.json({ error: 'Grocery item not found' }, { status: 404 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, item.flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('You are not a member of this flat');
  }

  const isAdder = item.addedBy === userSession.id;
  const isAdmin = membership.role === 'admin';

  if (!isAdder && !isAdmin) {
    return forbiddenResponse('Only the creator or admin can delete this grocery item');
  }

  await db.delete(groceryItems).where(eq(groceryItems.id, itemId));

  return NextResponse.json({ success: true, message: 'Grocery item deleted successfully' });
}

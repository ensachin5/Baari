import { NextResponse } from 'next/server';
import { db, groceryItems, flatMembers, user } from '@baari/db';
import { eq, and, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const addedByUser = alias(user, 'addedByUser');
const boughtByUser = alias(user, 'boughtByUser');

export async function GET(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const flatId = searchParams.get('flatId');
  const statusFilter = searchParams.get('status') as 'needed' | 'bought' | null;

  if (!flatId) {
    return NextResponse.json({ error: 'flatId query param is required' }, { status: 400 });
  }

  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('You are not a member of this flat');
  }

  const items = await db
    .select({
      id: groceryItems.id,
      flatId: groceryItems.flatId,
      itemName: groceryItems.itemName,
      status: groceryItems.status,
      addedBy: groceryItems.addedBy,
      boughtBy: groceryItems.boughtBy,
      boughtAt: groceryItems.boughtAt,
      createdAt: groceryItems.createdAt,
      addedByName: addedByUser.name,
      addedByImage: addedByUser.image,
      boughtByName: boughtByUser.name,
      boughtByImage: boughtByUser.image,
    })
    .from(groceryItems)
    .innerJoin(addedByUser, eq(groceryItems.addedBy, addedByUser.id))
    .leftJoin(boughtByUser, eq(groceryItems.boughtBy, boughtByUser.id))
    .where(
      statusFilter
        ? and(eq(groceryItems.flatId, flatId), eq(groceryItems.status, statusFilter))
        : eq(groceryItems.flatId, flatId)
    )
    .orderBy(desc(groceryItems.createdAt));

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { flatId, itemName } = body || {};

    if (!flatId || !itemName?.trim()) {
      return NextResponse.json({ error: 'flatId and itemName are required' }, { status: 400 });
    }

    const [membership] = await db
      .select()
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

    if (!membership) {
      return forbiddenResponse('You are not a member of this flat');
    }

    const [newItem] = await db
      .insert(groceryItems)
      .values({
        flatId,
        itemName: itemName.trim(),
        addedBy: userSession.id,
        status: 'needed',
      })
      .returning();

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (err: any) {
    console.error('[Add Grocery Item Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to add grocery item' }, { status: 500 });
  }
}

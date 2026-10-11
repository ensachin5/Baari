import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function getSessionUser(req?: Request) {
  try {
    const reqHeaders = req ? req.headers : await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session?.user) {
      return null;
    }

    return session.user;
  } catch (err) {
    console.error('[getSessionUser Error]', err);
    return null;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized. Please sign in.' },
    { status: 401 }
  );
}

export function forbiddenResponse(message = 'Forbidden.') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

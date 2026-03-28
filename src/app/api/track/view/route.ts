import { NextRequest, NextResponse } from 'next/server';
import { logBookView } from '@/lib/search-logger';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const { bookId } = await request.json();
    if (!bookId || typeof bookId !== 'string' || !UUID_RE.test(bookId)) {
      return NextResponse.json({ error: 'invalid bookId' }, { status: 400 });
    }

    logBookView({
      bookId,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
}

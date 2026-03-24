import { NextRequest, NextResponse } from 'next/server';
import { logPopularClick } from '@/lib/search-logger';

export async function POST(request: NextRequest) {
  try {
    const { bookTitle } = await request.json();
    if (!bookTitle || typeof bookTitle !== 'string') {
      return NextResponse.json({ error: 'bookTitle required' }, { status: 400 });
    }

    logPopularClick({
      bookTitle,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
}

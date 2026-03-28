import { NextRequest, NextResponse } from 'next/server';
import { runTrendingUpdate } from '@/lib/trending';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  // Validate CRON_SECRET
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runTrendingUpdate();
    return NextResponse.json({
      ok: true,
      date: new Date().toISOString().slice(0, 10),
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Trending update failed:', message);

    // Notify failure via Telegram
    sendTelegramMessage('toon', `❌ 인기작 업데이트 실패\n${message}`).catch(() => {});

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

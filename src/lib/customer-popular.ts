import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';

export async function updateCustomerPopular(days: number = 14): Promise<{
  updated: number;
  topBooks: { title: string; viewCount: number }[];
  cleaned: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // 1. RPC로 상위 10개 도서 조회 (고유 방문자 기준)
  const { data: popular, error } = await supabaseAdmin
    .rpc('get_customer_popular_books', {
      since_date: since.toISOString(),
      max_results: 10,
    });

  if (error) throw new Error(`RPC failed: ${error.message}`);

  // 2. 상위 도서에 순위 부여 (먼저 설정 후 나머지 초기화 — 빈 상태 방지)
  let updated = 0;
  const topBooks: { title: string; viewCount: number }[] = [];

  if (popular && popular.length > 0) {
    const bookIds = popular.map((p: { book_id: string }) => p.book_id);
    const { data: books } = await supabaseAdmin
      .from('books')
      .select('id, title')
      .in('id', bookIds);

    const bookMap = new Map(books?.map(b => [b.id, b.title]) || []);

    for (let i = 0; i < popular.length; i++) {
      const { book_id, view_count } = popular[i];
      const { error: updateError } = await supabaseAdmin
        .from('books')
        .update({ customer_popular_rank: i + 1 })
        .eq('id', book_id);

      if (!updateError) {
        updated++;
        topBooks.push({
          title: bookMap.get(book_id) || book_id,
          viewCount: Number(view_count),
        });
      }
    }

    // 새 목록에 없는 도서의 기존 순위 초기화
    await supabaseAdmin
      .from('books')
      .update({ customer_popular_rank: null })
      .not('customer_popular_rank', 'is', null)
      .not('id', 'in', `(${bookIds.join(',')})`);
  } else {
    // 인기 도서가 없으면 전체 초기화
    await supabaseAdmin
      .from('books')
      .update({ customer_popular_rank: null })
      .not('customer_popular_rank', 'is', null);
  }

  // 4. 90일 이전 book_views 레코드 정리
  const cleanupDate = new Date();
  cleanupDate.setDate(cleanupDate.getDate() - 90);
  const { count } = await supabaseAdmin
    .from('book_views')
    .delete({ count: 'exact' })
    .lt('created_at', cleanupDate.toISOString());
  const cleaned = count ?? 0;

  // 5. 텔레그램 알림
  if (topBooks.length > 0) {
    const list = topBooks.map((b, i) => `  ${i + 1}. ${b.title} (${b.viewCount}명)`).join('\n');
    const summary = `👀 고객 인기작 업데이트 완료\n• 기간: ${days}일\n• 반영: ${updated}개\n${list}${cleaned ? `\n• 정리: ${cleaned}건 삭제` : ''}`;
    sendTelegramMessage('toon', summary).catch(() => {});
  }

  return { updated, topBooks, cleaned: cleaned || 0 };
}

import { supabaseAdmin } from '@/lib/supabase';
import { timeAgo } from '@/lib/timeago';

export const revalidate = 0;

interface TrendingRow {
  external_title: string;
  external_author: string | null;
  external_rank: number;
  external_cover_url: string | null;
  matched_book_id: string | null;
  match_score: number | null;
  fetched_date: string;
  matched_book: { title: string; shelf_zone: string | null } | null;
}

export default async function AnalyticsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const days = typeof searchParams.days === 'string' ? parseInt(searchParams.days) : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const today = new Date().toISOString().slice(0, 10);

  const viewsSince = new Date();
  viewsSince.setDate(viewsSince.getDate() - days);

  const [allLogs, recentLogs, trendingResult, bookViewsResult] = await Promise.all([
    supabaseAdmin
      .from('search_logs')
      .select('search_term, result_count, was_converted, zone_filter, created_at')
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabaseAdmin
      .from('search_logs')
      .select('search_term, result_count, was_converted, zone_filter, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('trending_rankings')
      .select('external_title, external_author, external_rank, external_cover_url, matched_book_id, match_score, fetched_date, matched_book:books!matched_book_id(title, shelf_zone)')
      .eq('fetched_date', today)
      .order('external_rank', { ascending: true }),
    supabaseAdmin
      .rpc('get_customer_popular_books', {
        since_date: viewsSince.toISOString(),
        max_results: 20,
      }),
  ]);

  // 고객 인기 도서 처리
  const customerPopularRaw = (bookViewsResult.data || []) as { book_id: string; view_count: number }[];
  let customerPopularData: { rank: number; title: string; zone: string | null; view_count: number }[] = [];
  if (customerPopularRaw.length > 0) {
    const cpBookIds = customerPopularRaw.map(r => r.book_id);
    const { data: cpBooks } = await supabaseAdmin
      .from('books')
      .select('id, title, shelf_zone')
      .in('id', cpBookIds);
    const cpBookMap = new Map(cpBooks?.map(b => [b.id, b]) || []);
    customerPopularData = customerPopularRaw.map((r, i) => {
      const book = cpBookMap.get(r.book_id);
      return {
        rank: i + 1,
        title: book?.title || r.book_id,
        zone: book?.shelf_zone || null,
        view_count: Number(r.view_count),
      };
    });
  }
  const totalBookViews = customerPopularData.reduce((sum, d) => sum + d.view_count, 0);

  const logs = allLogs.data || [];
  const recentData = (recentLogs.data || []) as { search_term: string; result_count: number; was_converted: boolean; zone_filter: string | null; created_at: string }[];
  const trendingData = (trendingResult.data || []) as unknown as TrendingRow[];
  const trendingMatched = trendingData.filter(t => t.matched_book_id);
  const trendingUnmatched = trendingData.filter(t => !t.matched_book_id);
  const trendingLastDate = trendingData.length > 0 ? trendingData[0].fetched_date : null;

  // Aggregate top terms
  const termMap = new Map<string, { count: number; totalResults: number; zeroCount: number }>();
  for (const log of logs) {
    const existing = termMap.get(log.search_term);
    if (existing) {
      existing.count++;
      existing.totalResults += log.result_count;
      if (log.result_count === 0) existing.zeroCount++;
    } else {
      termMap.set(log.search_term, { count: 1, totalResults: log.result_count, zeroCount: log.result_count === 0 ? 1 : 0 });
    }
  }
  const topData = Array.from(termMap.entries())
    .map(([search_term, d]) => ({ search_term, count: d.count, avg_results: Math.round(d.totalResults / d.count), zero_count: d.zeroCount }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Aggregate zero-result searches
  const zeroMap = new Map<string, { count: number; last_searched: string }>();
  for (const log of logs) {
    if (log.result_count !== 0) continue;
    const existing = zeroMap.get(log.search_term);
    if (existing) {
      existing.count++;
      if (log.created_at > existing.last_searched) existing.last_searched = log.created_at;
    } else {
      zeroMap.set(log.search_term, { count: 1, last_searched: log.created_at });
    }
  }
  const zeroData = Array.from(zeroMap.entries())
    .map(([search_term, d]) => ({ search_term, ...d }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Aggregate daily volume
  const dayMap = new Map<string, { total: number; terms: Set<string>; zeros: number }>();
  for (const log of logs) {
    const day = log.created_at.slice(0, 10);
    const existing = dayMap.get(day);
    if (existing) {
      existing.total++;
      existing.terms.add(log.search_term);
      if (log.result_count === 0) existing.zeros++;
    } else {
      dayMap.set(day, { total: 1, terms: new Set([log.search_term]), zeros: log.result_count === 0 ? 1 : 0 });
    }
  }
  const dailyData = Array.from(dayMap.entries())
    .map(([day, d]) => ({ day, total_searches: d.total, unique_terms: d.terms.size, zero_result_searches: d.zeros }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const totalSearches = logs.length;
  const totalUniqueTerms = termMap.size;
  const totalZeroResults = logs.filter(l => l.result_count === 0).length;
  const zeroRate = totalSearches > 0 ? Math.round((totalZeroResults / totalSearches) * 100) : 0;
  const maxDaily = Math.max(...dailyData.map(d => d.total_searches), 1);

  const periodOptions = [7, 14, 30, 90];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">검색 분석 대시보드</h1>
        <div className="flex gap-2">
          {periodOptions.map(d => (
            <a
              key={d}
              href={`/admin/analytics?days=${d}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {d}일
            </a>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="총 검색 수" value={totalSearches.toLocaleString()} />
        <SummaryCard label="고유 검색어" value={totalUniqueTerms.toLocaleString()} />
        <SummaryCard label="결과 없음" value={totalZeroResults.toLocaleString()} />
        <SummaryCard label="결과 없음 비율" value={`${zeroRate}%`} highlight={zeroRate > 30} />
      </div>

      {/* Daily Volume Chart */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">일별 검색량</h2>
        <div className="space-y-1.5">
          {dailyData.slice(0, 30).map(d => (
            <div key={d.day} className="flex items-center gap-3 text-sm">
              <span className="w-20 text-muted-foreground shrink-0">{d.day.slice(5)}</span>
              <div className="flex-1 flex items-center gap-2">
                <div
                  className="h-5 bg-primary/80 rounded-sm"
                  style={{ width: `${(Number(d.total_searches) / maxDaily) * 100}%`, minWidth: '2px' }}
                />
                <span className="text-xs text-muted-foreground shrink-0">
                  {d.total_searches}
                  {Number(d.zero_result_searches) > 0 && (
                    <span className="text-destructive ml-1">({d.zero_result_searches} miss)</span>
                  )}
                </span>
              </div>
            </div>
          ))}
          {dailyData.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">데이터가 없습니다</p>
          )}
        </div>
      </section>

      {/* Top Search Terms */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">인기 검색어</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">검색어</th>
                <th className="pb-2 pr-4 text-right">횟수</th>
                <th className="pb-2 pr-4 text-right">평균 결과</th>
                <th className="pb-2 text-right">결과 없음</th>
              </tr>
            </thead>
            <tbody>
              {topData.map((row, i) => (
                <tr key={row.search_term} className={`border-b border-border/50 ${Number(row.zero_count) > 0 ? 'bg-destructive/5' : ''}`}>
                  <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium">{row.search_term}</td>
                  <td className="py-2 pr-4 text-right">{row.count}</td>
                  <td className="py-2 pr-4 text-right">{row.avg_results}</td>
                  <td className="py-2 text-right">{Number(row.zero_count) > 0 && <span className="text-destructive">{row.zero_count}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {topData.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">데이터가 없습니다</p>
          )}
        </div>
      </section>

      {/* Zero-Result Searches */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">결과 없는 검색어</h2>
        <p className="text-xs text-muted-foreground mb-4">입고 검토 대상 — 손님들이 찾았지만 없는 만화</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">검색어</th>
                <th className="pb-2 pr-4 text-right">횟수</th>
                <th className="pb-2 text-right">마지막 검색</th>
              </tr>
            </thead>
            <tbody>
              {zeroData.map(row => (
                <tr key={row.search_term} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{row.search_term}</td>
                  <td className="py-2 pr-4 text-right">{row.count}</td>
                  <td className="py-2 text-right text-muted-foreground">{timeAgo(row.last_searched)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {zeroData.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">모든 검색에 결과가 있습니다</p>
          )}
        </div>
      </section>

      {/* Trending Rankings */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">📊 외부 인기 순위 현황</h2>
        <p className="text-xs text-muted-foreground mb-4">알라딘 만화 베스트셀러 기준 {trendingLastDate ? `(${trendingLastDate})` : ''}</p>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <SummaryCard label="매칭 성공" value={String(trendingMatched.length)} />
          <SummaryCard label="미매칭" value={String(trendingUnmatched.length)} highlight={trendingUnmatched.length > 20} />
          <SummaryCard label="마지막 업데이트" value={trendingLastDate || '없음'} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">순위</th>
                <th className="pb-2 pr-4">외부 제목</th>
                <th className="pb-2 pr-4">매칭 도서</th>
                <th className="pb-2 pr-4 text-right">점수</th>
                <th className="pb-2">구역</th>
              </tr>
            </thead>
            <tbody>
              {trendingData.slice(0, 30).map(row => (
                <tr key={row.external_rank} className={`border-b border-border/50 ${!row.matched_book_id ? 'bg-yellow-500/5' : ''}`}>
                  <td className="py-2 pr-4 text-muted-foreground">{row.external_rank}</td>
                  <td className="py-2 pr-4 font-medium">{row.external_title}</td>
                  <td className="py-2 pr-4">{row.matched_book ? row.matched_book.title : <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-2 pr-4 text-right">{row.match_score ? `${Math.round(row.match_score * 100)}%` : '—'}</td>
                  <td className="py-2">{row.matched_book?.shelf_zone || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {trendingData.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">인기 순위 데이터가 없습니다. Cron이 아직 실행되지 않았을 수 있습니다.</p>
          )}
        </div>
      </section>

      {/* Customer Popular Books */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">👀 고객 인기 도서</h2>
        <p className="text-xs text-muted-foreground mb-4">최근 {days}일간 상세 페이지를 가장 많이 본 도서 (고유 방문자 기준)</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <SummaryCard label="총 조회 도서" value={String(customerPopularData.length)} />
          <SummaryCard label="고유 방문자 합계" value={String(totalBookViews)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">제목</th>
                <th className="pb-2 pr-4">구역</th>
                <th className="pb-2 text-right">방문자 수</th>
              </tr>
            </thead>
            <tbody>
              {customerPopularData.map(row => (
                <tr key={row.rank} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted-foreground">{row.rank}</td>
                  <td className="py-2 pr-4 font-medium">{row.title}</td>
                  <td className="py-2 pr-4">{row.zone || ''}</td>
                  <td className="py-2 text-right">{row.view_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {customerPopularData.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">조회 데이터가 아직 없습니다. 고객이 도서 상세 페이지를 방문하면 데이터가 쌓입니다.</p>
          )}
        </div>
      </section>

      {/* Purchase Recommendations */}
      {trendingUnmatched.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">🛒 입고 추천 목록</h2>
          <p className="text-xs text-muted-foreground mb-4">외부 인기작 중 카페에 없는 만화 — 구매 검토 대상</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">순위</th>
                  <th className="pb-2 pr-4">제목</th>
                  <th className="pb-2">저자</th>
                </tr>
              </thead>
              <tbody>
                {trendingUnmatched.map(row => (
                  <tr key={row.external_rank} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-muted-foreground">{row.external_rank}</td>
                    <td className="py-2 pr-4 font-medium">{row.external_title}</td>
                    <td className="py-2 text-muted-foreground">{row.external_author || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Searches */}
      <section>
        <h2 className="text-lg font-semibold mb-4">최근 검색 기록</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">시간</th>
                <th className="pb-2 pr-4">검색어</th>
                <th className="pb-2 pr-4 text-right">결과 수</th>
                <th className="pb-2 pr-4 text-center">변환</th>
                <th className="pb-2">구역</th>
              </tr>
            </thead>
            <tbody>
              {recentData.map((row, i) => (
                <tr key={`${row.created_at}-${i}`} className={`border-b border-border/50 ${row.result_count === 0 ? 'bg-destructive/5' : ''}`}>
                  <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{timeAgo(row.created_at)}</td>
                  <td className="py-2 pr-4 font-medium">{row.search_term}</td>
                  <td className="py-2 pr-4 text-right">{row.result_count === 0 ? <span className="text-destructive">0</span> : row.result_count}</td>
                  <td className="py-2 pr-4 text-center">{row.was_converted ? '🔄' : ''}</td>
                  <td className="py-2">{row.zone_filter || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentData.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">검색 기록이 없습니다</p>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-destructive/50 bg-destructive/5' : 'bg-card'}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-destructive' : ''}`}>{value}</p>
    </div>
  );
}

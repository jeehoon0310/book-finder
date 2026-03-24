import { supabaseAdmin } from '@/lib/supabase';
import { timeAgo } from '@/lib/timeago';

export const revalidate = 0;

export default async function AnalyticsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const days = typeof searchParams.days === 'string' ? parseInt(searchParams.days) : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const [allLogs, recentLogs] = await Promise.all([
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
  ]);

  const logs = allLogs.data || [];
  const recentData = (recentLogs.data || []) as { search_term: string; result_count: number; was_converted: boolean; zone_filter: string | null; created_at: string }[];

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

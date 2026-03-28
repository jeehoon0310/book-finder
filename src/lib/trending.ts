import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';

// --- Aladin API Types ---

interface AladinItem {
  title: string;
  author: string;
  cover: string;
  isbn13: string;
  bestRank: number;
  categoryName: string;
}

interface AladinResponse {
  totalResults: number;
  item: AladinItem[];
}

// --- Matching Types ---

export interface TrendingMatch {
  externalTitle: string;
  externalAuthor: string;
  externalRank: number;
  externalCoverUrl: string;
  isbn13: string;
  matchedBookId: string | null;
  matchedBookTitle: string | null;
  matchScore: number;
}

// --- Aladin API ---

export async function fetchAladinBestsellers(): Promise<AladinItem[]> {
  const key = process.env.ALADIN_TTB_KEY;
  if (!key) throw new Error('ALADIN_TTB_KEY not configured');

  const url = new URL('http://www.aladin.co.kr/ttb/api/ItemList.aspx');
  url.searchParams.set('ttbkey', key);
  url.searchParams.set('QueryType', 'Bestseller');
  url.searchParams.set('MaxResults', '50');
  url.searchParams.set('Start', '1');
  url.searchParams.set('SearchTarget', 'Book');
  url.searchParams.set('CategoryId', '2551'); // 만화/라이트노벨
  url.searchParams.set('Output', 'js');
  url.searchParams.set('Version', '20131101');

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Aladin API error: ${res.status}`);

  const data: AladinResponse = await res.json();
  return data.item || [];
}

// --- Title Normalization ---

export function normalizeTitle(title: string): string {
  return title
    .replace(/\s*\d+\s*$/, '')             // trailing volume number: "원피스 109" → "원피스"
    .replace(/\s*제?\d+[권화]?\s*$/, '')    // "나루토 제5권" → "나루토"
    .replace(/\s*\(만화\)\s*/g, '')
    .replace(/\s*\(코믹스?\)\s*/g, '')
    .replace(/\s*\(라이트노벨\)\s*/g, '')
    .replace(/\s*\([^)]*판\)\s*/g, '')      // "(특별판)", "(한정판)" etc.
    .trim()
    .toLowerCase();
}

// --- Levenshtein Distance ---

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// --- Fuzzy Match Score ---

export function matchScore(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);

  if (!na || !nb) return 0;

  // Exact match
  if (na === nb) return 1.0;

  // Contains match
  if (na.startsWith(nb) || nb.startsWith(na)) return 0.9;

  // Levenshtein
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

// --- Match Rankings to Local Books ---

interface LocalBook {
  id: string;
  title: string;
  author: string | null;
}

export function matchRankingsToBooks(
  rankings: AladinItem[],
  books: LocalBook[],
): TrendingMatch[] {
  return rankings.map(item => {
    let bestMatch: LocalBook | null = null;
    let bestScore = 0;

    for (const book of books) {
      let score = matchScore(item.title, book.title);

      // Author boost
      if (score >= 0.5 && item.author && book.author) {
        const extAuthor = item.author.split('(')[0].trim().toLowerCase();
        const localAuthor = book.author.toLowerCase();
        if (extAuthor.includes(localAuthor) || localAuthor.includes(extAuthor)) {
          score = Math.min(score + 0.1, 1.0);
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = book;
      }
    }

    return {
      externalTitle: item.title,
      externalAuthor: item.author,
      externalRank: item.bestRank,
      externalCoverUrl: item.cover,
      isbn13: item.isbn13,
      matchedBookId: bestScore >= 0.6 ? bestMatch!.id : null,
      matchedBookTitle: bestScore >= 0.6 ? bestMatch!.title : null,
      matchScore: bestScore,
    };
  });
}

// --- Database Update ---

export async function updateTrendingData(matches: TrendingMatch[]): Promise<{
  matched: number;
  unmatched: number;
  updated: number;
}> {
  const today = new Date().toISOString().slice(0, 10);

  // Delete today's existing data (idempotent re-run)
  await supabaseAdmin
    .from('trending_rankings')
    .delete()
    .eq('fetched_date', today);

  // Insert new rankings
  const rows = matches.map(m => ({
    source: 'aladin' as const,
    external_title: m.externalTitle,
    external_author: m.externalAuthor,
    external_rank: m.externalRank,
    external_cover_url: m.externalCoverUrl,
    isbn13: m.isbn13,
    matched_book_id: m.matchedBookId,
    match_score: m.matchScore,
    fetched_date: today,
  }));

  const { error: insertError } = await supabaseAdmin
    .from('trending_rankings')
    .insert(rows);

  if (insertError) throw new Error(`Insert trending failed: ${insertError.message}`);

  // Reset all books
  await supabaseAdmin
    .from('books')
    .update({ is_popular: false, trending_rank: null })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // match all

  // Set top 10 matched books as popular
  const matchedBooks = matches
    .filter(m => m.matchedBookId)
    .sort((a, b) => a.externalRank - b.externalRank)
    .slice(0, 10);

  let updated = 0;
  for (let i = 0; i < matchedBooks.length; i++) {
    const { error } = await supabaseAdmin
      .from('books')
      .update({ is_popular: true, trending_rank: i + 1 })
      .eq('id', matchedBooks[i].matchedBookId!);
    if (!error) updated++;
  }

  return {
    matched: matches.filter(m => m.matchedBookId).length,
    unmatched: matches.filter(m => !m.matchedBookId).length,
    updated,
  };
}

// --- Full Update Pipeline ---

export async function runTrendingUpdate(): Promise<{
  matched: number;
  unmatched: number;
  updated: number;
  totalFetched: number;
}> {
  // 1. Fetch external rankings
  const rankings = await fetchAladinBestsellers();

  // 2. Load local books
  const { data: books, error } = await supabaseAdmin
    .from('books')
    .select('id, title, author');

  if (error || !books) throw new Error(`Failed to load books: ${error?.message}`);

  // 3. Match
  const matches = matchRankingsToBooks(rankings, books);

  // 4. Update DB
  const result = await updateTrendingData(matches);

  // 5. Notify via Telegram
  const summary = `📊 인기작 자동 업데이트 완료\n• 외부 순위: ${rankings.length}개\n• 매칭 성공: ${result.matched}개\n• 미매칭: ${result.unmatched}개\n• 홈 반영: ${result.updated}개`;
  sendTelegramMessage('toon', summary).catch(() => {});

  return { ...result, totalFetched: rankings.length };
}

import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

const BOT_PATTERNS = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu/i;

interface SearchLogEntry {
  searchTerm: string;
  actualSearchTerm?: string;
  resultCount: number;
  wasConverted: boolean;
  zoneFilter?: string;
  userAgent?: string;
  ip?: string;
}

export function logPopularClick(entry: { bookTitle: string; userAgent?: string; ip?: string }): void {
  if (entry.userAgent && BOT_PATTERNS.test(entry.userAgent)) return;

  supabaseAdmin
    .from('search_logs')
    .insert({
      search_term: `[인기작] ${entry.bookTitle}`,
      result_count: 1,
      was_converted: false,
      user_agent: entry.userAgent || null,
      ip_hash: entry.ip
        ? createHash('sha256').update(entry.ip).digest('hex')
        : null,
    })
    .then(({ error }) => {
      if (error) console.error('Popular click log failed:', error.message);
    });
}

export function logBookView(entry: { bookId: string; userAgent?: string; ip?: string }): void {
  if (entry.userAgent && BOT_PATTERNS.test(entry.userAgent)) return;

  supabaseAdmin
    .from('book_views')
    .insert({
      book_id: entry.bookId,
      ip_hash: entry.ip
        ? createHash('sha256').update(entry.ip).digest('hex')
        : null,
      user_agent: entry.userAgent || null,
    })
    .then(({ error }) => {
      if (error) console.error('Book view log failed:', error.message);
    });
}

export function logSearch(entry: SearchLogEntry): void {
  // Skip bot traffic
  if (entry.userAgent && BOT_PATTERNS.test(entry.userAgent)) return;

  // Fire-and-forget: intentionally not awaited
  supabaseAdmin
    .from('search_logs')
    .insert({
      search_term: entry.searchTerm,
      actual_search_term: entry.actualSearchTerm || null,
      result_count: entry.resultCount,
      was_converted: entry.wasConverted,
      zone_filter: entry.zoneFilter || null,
      user_agent: entry.userAgent || null,
      ip_hash: entry.ip
        ? createHash('sha256').update(entry.ip).digest('hex')
        : null,
    })
    .then(({ error }) => {
      if (error) console.error('Search log insert failed:', error.message);
    });
}

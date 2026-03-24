import { Suspense } from 'react';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { engToKor, korToEng, isAllEnglish, hasKorean } from '@/lib/hangul';
import { logSearch } from '@/lib/search-logger';
import { SearchBar } from '@/components/domain/SearchBar';
import { InfiniteBookList } from '@/components/domain/InfiniteBookList';
import { BookListSkeleton } from '@/components/domain/BookListSkeleton';

export const revalidate = 0; // Dynamic route

export default async function SearchPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === 'string' ? searchParams.q : '';
  const zone = typeof searchParams.zone === 'string' ? searchParams.zone : '';

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-6">
      <section className="w-full mb-4">
        <Suspense fallback={<div className="h-14 w-full max-w-2xl mx-auto bg-muted rounded-full animate-pulse" />}>
          <SearchBar />
        </Suspense>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-6">
          {query ? `'${query}' 검색 결과` : zone ? `'${zone}' 구역 도서` : '전체 도서'}
        </h2>
        
        <Suspense key={`${query}-${zone}`} fallback={<BookListSkeleton count={12} />}>
          <SearchResults query={query} zone={zone} />
        </Suspense>
      </section>
    </div>
  );
}

async function SearchResults({ query, zone }: { query: string; zone: string }) {
  const { data: books, error } = await supabase.rpc('search_books', {
    search_term: query,
    genre_filter: null,
    zone_filter: zone || null,
    result_limit: 20,
    result_offset: 0
  });

  if (error) {
    console.error('Error in search:', error);
    return <div className="py-10 text-center text-destructive">결과를 불러오는 중 오류가 발생했습니다.</div>;
  }

  let initialBooks = books || [];
  let actualSearchTerm = query;
  let convertedHint: string | null = null;

  // Fallback: 결과 없으면 영타↔한타 변환하여 재검색
  if (initialBooks.length === 0 && query) {
    let converted: string | null = null;

    if (isAllEnglish(query)) {
      converted = engToKor(query);
    } else if (hasKorean(query)) {
      converted = korToEng(query);
    }

    if (converted && converted !== query) {
      const { data: fallbackBooks } = await supabase.rpc('search_books', {
        search_term: converted,
        genre_filter: null,
        zone_filter: zone || null,
        result_limit: 20,
        result_offset: 0
      });

      if (fallbackBooks && fallbackBooks.length > 0) {
        initialBooks = fallbackBooks;
        actualSearchTerm = converted;
        convertedHint = converted;
      }
    }
  }

  // Log search query (fire-and-forget)
  if (query) {
    const headersList = await headers();
    logSearch({
      searchTerm: query,
      actualSearchTerm: convertedHint || undefined,
      resultCount: initialBooks.length,
      wasConverted: !!convertedHint,
      zoneFilter: zone || undefined,
      userAgent: headersList.get('user-agent') || undefined,
      ip: headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headersList.get('x-real-ip')
        || undefined,
    });
  }

  return (
    <>
      {convertedHint && (
        <p className="text-sm text-muted-foreground mb-4">
          &apos;{convertedHint}&apos;(으)로 검색한 결과입니다
        </p>
      )}
      <InfiniteBookList initialBooks={initialBooks} fetchType="search" searchTerm={actualSearchTerm} zoneFilter={zone} />
    </>
  );
}

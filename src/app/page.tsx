import { Suspense } from 'react';
import Link from 'next/link';
import { MessageSquarePlus, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SearchBar } from '@/components/domain/SearchBar';
import { BookCard } from '@/components/domain/BookCard';
import { BookListSkeleton } from '@/components/domain/BookListSkeleton';
import { InfiniteBookList } from '@/components/domain/InfiniteBookList';

const ZONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'];

export const revalidate = 60; // Cache the page for 60s

async function PopularBooks() {
  const { data: popularBooks } = await supabase
    .from('books')
    .select('*')
    .eq('is_popular', true)
    .order('trending_rank', { ascending: true, nullsFirst: false })
    .limit(10);

  if (!popularBooks?.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-primary">🔥</span> 요즘 뜨는 인기작
      </h2>
      <div className="flex overflow-x-auto gap-4 pb-4 snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {popularBooks.map(book => (
          <div key={book.id} className="min-w-[140px] w-[140px] sm:min-w-[160px] sm:w-[160px] snap-start shrink-0">
            <BookCard book={book} trackPopular />
          </div>
        ))}
      </div>
    </section>
  );
}

// 이 날짜 이후 등록된 책만 신간으로 표시 (30일 자동 만료)
const NEW_ARRIVALS_SINCE = '2026-03-25T00:00:00+09:00';

async function NewBooks() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = new Date(Math.max(thirtyDaysAgo.getTime(), new Date(NEW_ARRIVALS_SINCE).getTime()));

  const { data: newBooks } = await supabase
    .from('books')
    .select('*')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (!newBooks?.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-primary">✨</span> 새로 들어온 신간
      </h2>
      <div className="flex overflow-x-auto gap-4 pb-4 snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {newBooks.map(book => (
          <div key={book.id} className="min-w-[140px] w-[140px] sm:min-w-[160px] sm:w-[160px] snap-start shrink-0">
            <BookCard book={book} />
          </div>
        ))}
      </div>
    </section>
  );
}

async function CustomerPopularBooks() {
  const { data: customerPopular } = await supabase
    .from('books')
    .select('*')
    .not('customer_popular_rank', 'is', null)
    .order('customer_popular_rank', { ascending: true })
    .limit(10);

  if (!customerPopular?.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-primary">👀</span> 손님들이 많이 찾는 만화
      </h2>
      <div className="flex overflow-x-auto gap-4 pb-4 snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {customerPopular.map(book => (
          <div key={book.id} className="min-w-[140px] w-[140px] sm:min-w-[160px] sm:w-[160px] snap-start shrink-0">
            <BookCard book={book} />
          </div>
        ))}
      </div>
    </section>
  );
}

// Fetch first page of recent/all books
async function RecentBooks() {
  const { data: books } = await supabase
    .from('books')
    .select('*')
    .order('shelf_zone')
    .order('shelf_number')
    .order('title')
    .limit(20);

  if (!books?.length) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">전체 도서</h2>
      </div>
      <InfiniteBookList initialBooks={books} fetchType="all" />
    </section>
  );
}

async function getBookStats() {
  const { data } = await supabase.from('books').select('volumes');
  if (!data) return { titles: 0, volumes: 0 };
  let volumes = 0;
  data.forEach(b => {
    const v = b.volumes;
    if (!v || v === '단권') { volumes += 1; return; }
    const match = v.match(/(\d+)\s*[~\-]\s*(\d+)/);
    volumes += match ? parseInt(match[2]) - parseInt(match[1]) + 1 : 1;
  });
  return { titles: data.length, volumes };
}

export default async function Home() {
  const { titles, volumes } = await getBookStats();

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-6">
      <section className="w-full py-8 md:py-12 flex flex-col items-center text-center gap-4">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          어떤 만화를 <br className="sm:hidden"/> <span className="text-primary">찾으시나요?</span>
        </h1>
        <p className="text-muted-foreground mb-4">
          {titles}종 {volumes.toLocaleString()}권의 만화를 빠르게 검색하세요
        </p>
        <Suspense fallback={<div className="h-14 w-full max-w-2xl bg-muted rounded-full animate-pulse" />}>
          <SearchBar />
        </Suspense>
      </section>

      <section className="mt-2">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">구역별 빠른 이동</h2>
        <div className="flex flex-wrap gap-2">
          {ZONES.map(zone => (
            <Link 
              key={zone} 
              href={`/zone/${zone}`}
              className="px-4 py-2 rounded-full border border-border bg-card hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors text-sm font-medium"
            >
              {zone} 구역
            </Link>
          ))}
        </div>
      </section>

      <Link
        href="/feedback"
        className="mt-4 flex items-center gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group"
      >
        <MessageSquarePlus className="w-8 h-8 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">의견을 들려주세요!</p>
          <p className="text-xs text-muted-foreground">건의사항이나 불편한 점을 남겨주시면 빠르게 반영하겠습니다.</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </Link>

      <Suspense fallback={<div className="mt-8"><BookListSkeleton count={6}/></div>}>
        <NewBooks />
      </Suspense>

      <Suspense fallback={<div className="mt-8"><BookListSkeleton count={6}/></div>}>
        <PopularBooks />
      </Suspense>

      <Suspense fallback={<div className="mt-8"><BookListSkeleton count={6}/></div>}>
        <CustomerPopularBooks />
      </Suspense>

      <Suspense fallback={<div className="mt-10"><BookListSkeleton count={12}/></div>}>
        <RecentBooks />
      </Suspense>
    </div>
  );
}

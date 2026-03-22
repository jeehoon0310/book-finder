import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InfiniteBookList } from '@/components/domain/InfiniteBookList';
import { BookListSkeleton } from '@/components/domain/BookListSkeleton';

export const revalidate = 60; // Cache 60s

export default async function ZonePage(props: { params: Promise<{ name: string }> }) {
  const params = await props.params;
  const zone = params.name.toUpperCase();

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
        </Link>
        <h1 className="text-3xl font-black tracking-tight">{zone} 구역 도서</h1>
      </div>

      <p className="text-muted-foreground mb-4">
        {zone} 구역 서가에 비치된 도서들을 번호 순서대로 확인하실 수 있습니다.
      </p>

      <section>
        <Suspense fallback={<BookListSkeleton count={12} />}>
          <ZoneResults zone={zone} />
        </Suspense>
      </section>
    </div>
  );
}

async function ZoneResults({ zone }: { zone: string }) {
  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .eq('shelf_zone', zone)
    .order('shelf_number')
    .order('title')
    .limit(20);

  if (error || !books) {
    if (error) console.error('Error fetching zone books:', error);
    notFound();
  }

  return <InfiniteBookList initialBooks={books} fetchType="zone" zoneFilter={zone} />;
}

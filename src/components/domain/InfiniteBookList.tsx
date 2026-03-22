'use client';

import { useState, useCallback } from 'react';
import { SearchX, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { BookCard } from './BookCard';
import { LoadMore } from './LoadMore';
import { PurchaseRequestDialog } from './PurchaseRequestDialog';

type Book = Database['public']['Tables']['books']['Row'];

interface InfiniteBookListProps {
  initialBooks: Book[];
  fetchType: 'all' | 'search' | 'zone';
  zoneFilter?: string;
  searchTerm?: string;
}

const PAGE_SIZE = 20;

export function InfiniteBookList({ initialBooks, fetchType, zoneFilter, searchTerm }: InfiniteBookListProps) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialBooks.length === PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);

  const loadMoreBooks = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    const offset = page * PAGE_SIZE;

    try {
      let newData: Book[] | null = null;
      let error = null;

      if (fetchType === 'search') {
        const { data, error: err } = await supabase.rpc('search_books', {
          search_term: searchTerm || '',
          genre_filter: null,
          zone_filter: zoneFilter || null,
          result_limit: PAGE_SIZE,
          result_offset: offset
        });
        newData = data;
        error = err;
      } else if (fetchType === 'zone') {
        const { data, error: err } = await supabase
          .from('books')
          .select('*')
          .eq('shelf_zone', zoneFilter!)
          .order('shelf_number')
          .order('title')
          .range(offset, offset + PAGE_SIZE - 1);
        newData = data;
        error = err;
      } else {
        // 'all'
        const { data, error: err } = await supabase
          .from('books')
          .select('*')
          .order('shelf_zone')
          .order('shelf_number')
          .order('title')
          .range(offset, offset + PAGE_SIZE - 1);
        newData = data;
        error = err;
      }

      if (error) {
        console.error('Error fetching books:', error);
      } else if (newData) {
        setBooks(prev => [...prev, ...newData]);
        setPage(p => p + 1);
        if (newData.length < PAGE_SIZE) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchType, hasMore, isLoading, page, searchTerm, zoneFilter]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {books.map(book => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>

      {books.length === 0 && !isLoading && (
        fetchType === 'search' ? (
          <EmptySearchState searchTerm={searchTerm} />
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            검색 결과가 없습니다.
          </div>
        )
      )}

      {hasMore && (
        <LoadMore onLoadMore={loadMoreBooks} hasMore={hasMore} isLoading={isLoading} />
      )}
    </div>
  );
}

function EmptySearchState({ searchTerm }: { searchTerm?: string }) {
  const [showRequest, setShowRequest] = useState(false);

  return (
    <>
      <div className="py-16 flex flex-col items-center gap-4 text-center">
        <div className="p-4 rounded-full bg-muted">
          <SearchX className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-semibold mb-1">찾으시는 만화가 없어서 죄송해요</p>
          {searchTerm && (
            <p className="text-sm text-muted-foreground">
              &apos;{searchTerm}&apos;에 대한 검색 결과가 없습니다
            </p>
          )}
        </div>
        <button
          onClick={() => setShowRequest(true)}
          className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          구매 요청하기
        </button>
        <p className="text-xs text-muted-foreground">
          요청해주시면 입고를 검토하겠습니다
        </p>
      </div>
      <PurchaseRequestDialog
        open={showRequest}
        onOpenChange={setShowRequest}
        defaultTitle={searchTerm || ''}
      />
    </>
  );
}

'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';

interface LoadMoreProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
}

export function LoadMore({ onLoadMore, hasMore, isLoading }: LoadMoreProps) {
  const { ref, inView } = useInView({
    // Only fetch when the element is 100px from viewport
    rootMargin: '100px',
  });

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={ref} className="w-full flex justify-center py-8">
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      ) : (
        <div className="h-6" /> /* Placeholder heights to ensure it triggers */
      )}
    </div>
  );
}

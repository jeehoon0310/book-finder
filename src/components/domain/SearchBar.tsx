'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const mounted = useRef(false);
  const lastPushed = useRef(debouncedSearchTerm);
  const isComposing = useRef(false);

  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    if (!mounted.current) return;
    // Skip routing while IME is composing (Korean, Japanese, etc.)
    if (isComposing.current) return;
    if (debouncedSearchTerm === lastPushed.current) return;
    lastPushed.current = debouncedSearchTerm;

    if (debouncedSearchTerm) {
      router.push(`/search?q=${encodeURIComponent(debouncedSearchTerm)}`);
    } else {
      router.push(`/`);
    }
  }, [debouncedSearchTerm, router]);

  useEffect(() => {
    // Sync with URL changes (e.g., back button)
    const q = searchParams.get('q') || '';
    if (q !== searchTerm) {
      setSearchTerm(q);
      lastPushed.current = q;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing.current && searchTerm.trim()) {
      e.preventDefault();
      lastPushed.current = searchTerm;
      router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    router.push('/');
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="만화 제목, 초성(예: ㅇㅍㅅ), 작가 등을 검색해보세요"
          className="pl-10 pr-10 py-6 text-base rounded-full border-primary/20 bg-background/50 focus-visible:ring-primary shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposing.current = true; }}
          onCompositionEnd={(e) => {
            isComposing.current = false;
            setSearchTerm((e.target as HTMLInputElement).value);
          }}
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

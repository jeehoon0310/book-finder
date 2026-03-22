'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Search, MessageSquarePlus } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 transition-colors hover:text-primary shrink-0">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg hidden sm:inline-block">툰슐랭 만화카페</span>
          <span className="font-bold text-lg sm:hidden">툰슐랭</span>
        </Link>

        <Link
          href="/feedback"
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
          title="의견함"
        >
          <MessageSquarePlus className="h-5 w-5" />
          <span className="hidden sm:inline text-sm">의견함</span>
        </Link>

        <form onSubmit={handleSubmit} className="flex-1 max-w-sm ml-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-full border border-border/60 bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/60"
            />
          </div>
        </form>
      </div>
    </header>
  );
}

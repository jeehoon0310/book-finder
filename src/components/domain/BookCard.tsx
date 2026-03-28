'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Database } from '@/types/database';
import { ZoneBadge } from './ZoneBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookDescriptionModal } from './BookDescriptionModal';

type Book = Database['public']['Tables']['books']['Row'];

interface BookCardProps {
  book: Book;
  compact?: boolean;
  trackPopular?: boolean;
}

export function BookCard({ book, compact = false, trackPopular = false }: BookCardProps) {
  const [showDescription, setShowDescription] = useState(false);
  const hasDescription = !!book.description;

  const handleClick = () => {
    if (trackPopular) {
      fetch('/api/track/popular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookTitle: book.title }),
      }).catch(() => {});
    }
  };

  return (
    <>
      <Link href={`/book/${book.id}`} className="block h-full group" onClick={handleClick}>
        <Card className="h-full overflow-hidden border-border/40 bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-300">
          <CardContent className="p-0 flex flex-col h-full">
            {/* Cover Image or Placeholder */}
            <div className="relative aspect-[2/3] w-full bg-gradient-to-br from-secondary to-muted overflow-hidden flex items-center justify-center p-4">
              {book.cover_url ? (
                <Image
                  src={book.cover_url}
                  alt={book.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="text-center">
                  <p className="font-bold text-muted-foreground line-clamp-3 text-sm">{book.title}</p>
                </div>
              )}

              {/* Overlay Badges */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                <ZoneBadge zone={book.shelf_zone} shelfNumber={book.shelf_number} />
                {new Date(book.created_at) >= new Date('2026-03-25T00:00:00+09:00') && Date.now() - new Date(book.created_at).getTime() < 30 * 24 * 60 * 60 * 1000 && <Badge className="bg-blue-500 text-white hover:bg-blue-600 shadow-sm border-none">NEW</Badge>}
                {book.is_popular && book.trending_rank ? (
                  <Badge variant="destructive" className="shadow-sm border-none">#{book.trending_rank}</Badge>
                ) : book.is_popular ? (
                  <Badge variant="destructive" className="shadow-sm border-none">BEST</Badge>
                ) : null}
              </div>

              {/* Description Button */}
              {hasDescription && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDescription(true);
                  }}
                  className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium hover:bg-black/80 transition-colors"
                >
                  <BookOpen className="w-3 h-3" />
                  소개
                </button>
              )}
            </div>

            {/* Details */}
            <div className="p-3 flex flex-col flex-1 gap-1">
              <h3 className="font-bold text-sm sm:text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {book.title}
              </h3>

              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="text-xs text-muted-foreground w-full truncate">
                  {book.volumes || '단권'}
                </span>
                {book.genre && book.genre !== '미분류' && (
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm whitespace-nowrap ml-2">
                    {book.genre}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {hasDescription && (
        <BookDescriptionModal
          book={book}
          open={showDescription}
          onOpenChange={setShowDescription}
        />
      )}
    </>
  );
}

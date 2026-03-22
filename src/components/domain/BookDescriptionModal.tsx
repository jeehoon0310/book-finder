'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Database } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookDescription } from './BookDescription';

type Book = Database['public']['Tables']['books']['Row'];

interface BookDescriptionModalProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookDescriptionModal({ book, open, onOpenChange }: BookDescriptionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">작품 소개</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-4 pb-4 border-b border-border">
          <div className="relative w-16 h-24 shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
            {book.cover_url ? (
              <Image
                src={book.cover_url}
                alt={book.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <p className="text-[10px] font-bold text-muted-foreground text-center px-1 line-clamp-3">
                {book.title}
              </p>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight truncate">{book.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {[book.author, book.genre].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <BookDescription description={book.description} tags={book.tags} />

        <div className="pt-2 border-t border-border">
          <Link
            href={`/book/${book.id}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            onClick={() => onOpenChange(false)}
          >
            상세 보기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

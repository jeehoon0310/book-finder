import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, BookOpen, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ZoneBadge } from '@/components/domain/ZoneBadge';
import { BookDescription } from '@/components/domain/BookDescription';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TrackBookView } from '@/components/domain/TrackBookView';

export default async function BookDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (!book) {
    notFound();
  }

  // Fetch series if exists
  let seriesBooks = [];
  if (book.series_name) {
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('series_name', book.series_name)
      .neq('id', book.id)
      .order('shelf_zone')
      .order('shelf_number');
    
    if (data) seriesBooks = data;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <TrackBookView bookId={book.id} />
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        돌아가기
      </Link>
      
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Cover */}
        <div className="w-full md:w-1/3 shrink-0">
          <div className="relative aspect-[2/3] w-full max-w-[300px] mx-auto md:mx-0 rounded-xl overflow-hidden shadow-xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center p-6">
            {book.cover_url ? (
              <Image 
                src={book.cover_url} 
                alt={book.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
            ) : (
              <div className="text-center w-full break-words">
                <p className="font-bold text-muted-foreground text-xl md:text-2xl leading-tight">{book.title}</p>
              </div>
            )}
            
            <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
              {new Date(book.created_at) >= new Date('2026-03-25T00:00:00+09:00') && Date.now() - new Date(book.created_at).getTime() < 30 * 24 * 60 * 60 * 1000 && <Badge className="bg-blue-500 text-white shadow-sm border-none pointer-events-none">NEW</Badge>}
              {book.is_popular && <Badge variant="destructive" className="shadow-sm border-none pointer-events-none">BEST</Badge>}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 w-full space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {book.genre && book.genre !== '미분류' && (
                <Badge variant="secondary">{book.genre}</Badge>
              )}
              <Badge variant="outline" className={book.status === 'reading' ? 'text-primary border-primary/50' : book.status === 'missing' ? 'text-destructive border-destructive/50' : 'text-green-500 border-green-500/50'}>
                {book.status === 'reading' ? '누군가 읽고 있어요' : book.status === 'missing' ? '위치 확인 필요' : '보관중'}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">{book.title}</h1>
            {book.author && <p className="text-lg text-muted-foreground">{book.author}</p>}
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-background rounded-full shrink-0 shadow-sm text-primary">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">현재 서가 위치</p>
                    <div className="flex items-center gap-3">
                      <ZoneBadge zone={book.shelf_zone} shelfNumber={book.shelf_number} size="lg" />
                      <span className="text-lg font-semibold border-l pl-3 border-border">
                        {book.volumes || '단권'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {book.description && (
            <Card className="bg-card/50 border-border/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">작품 소개</h2>
                </div>
                <BookDescription description={book.description} tags={book.tags} />
              </CardContent>
            </Card>
          )}

          {/* Series Links */}
          {seriesBooks.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border">
              <h3 className="text-lg font-bold mb-4">같은 시리즈의 다른 권 위치</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {seriesBooks.map(seriesBook => (
                  <Link key={seriesBook.id} href={`/book/${seriesBook.id}`}>
                    <Card className="hover:border-primary/50 transition-colors bg-card/50">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-semibold truncate text-sm">{seriesBook.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{seriesBook.volumes}</p>
                        </div>
                        <ZoneBadge zone={seriesBook.shelf_zone} shelfNumber={seriesBook.shelf_number} />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

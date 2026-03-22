import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function BookCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden border-border/40 bg-card/50">
      <CardContent className="p-0 flex flex-col h-full">
        <Skeleton className="relative aspect-[2/3] w-full rounded-none" />
        <div className="p-3 flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="mt-4 flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BookListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

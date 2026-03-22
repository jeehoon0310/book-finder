import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ZoneBadgeProps {
  zone: string | null;
  shelfNumber: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ZoneBadge({ zone, shelfNumber, className, size = 'sm' }: ZoneBadgeProps) {
  if (!zone) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <Badge 
      variant="default" 
      className={cn(
        "font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        sizeClasses[size],
        className
      )}
    >
      {zone}{shelfNumber ? `-${shelfNumber}` : ''}
    </Badge>
  );
}

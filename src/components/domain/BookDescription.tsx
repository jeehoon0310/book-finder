import { Badge } from '@/components/ui/badge';

interface BookDescriptionProps {
  description: string | null;
  tags: string[] | null;
}

export function BookDescription({ description, tags }: BookDescriptionProps) {
  if (!description) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
        {description}
      </p>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs font-normal text-primary/80 bg-primary/10 hover:bg-primary/15 border-none"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

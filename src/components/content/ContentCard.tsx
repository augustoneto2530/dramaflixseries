import { Link } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import { Content, CATEGORY_LABELS, ContentCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ContentCardProps {
  content: Content;
  variant?: 'default' | 'large';
}

const categoryStyles: Record<ContentCategory, string> = {
  doramas: 'category-doramas',
  adult: 'category-adult',
  novelas: 'category-novelas',
  filmes: 'category-filmes',
  series: 'category-series',
};

export function ContentCard({ content, variant = 'default' }: ContentCardProps) {
  const isLarge = variant === 'large';

  return (
    <Link
      to={`/assistir/${content.id}`}
      className={cn(
        'content-card group block relative',
        isLarge ? 'aspect-[2/3]' : 'aspect-[2/3]'
      )}
    >
      {/* Cover Image */}
      <img
        src={content.cover_image_url || '/placeholder.svg'}
        alt={content.title}
        className="w-full h-full object-cover rounded-lg"
        loading="lazy"
      />

      {/* Rating Badge - Top Right */}
      <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2">
        <div className="flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-full px-1.5 py-0.5">
          <Star className="h-2.5 w-2.5 md:h-3 md:w-3 fill-accent text-accent" />
          <span className="text-[10px] md:text-xs font-medium">{content.rating}</span>
        </div>
      </div>

      {/* Category Badge - Top Left */}
      <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 flex flex-col gap-0.5">
        {content.is_new && (
          <span className="category-badge bg-destructive/90 text-destructive-foreground text-[8px] md:text-[10px] px-1.5 py-0.5">
            LANÇAMENTO
          </span>
        )}
        <span className={cn('category-badge text-[8px] md:text-[10px] px-1.5 py-0.5', categoryStyles[content.category])}>
          {CATEGORY_LABELS[content.category]}
        </span>
      </div>

      {/* Hover Overlay with Play Button */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
        <div className="absolute inset-0 flex items-center justify-center">
          <Button size="sm" className="brand-gradient glow-primary h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm">
            <Play className="h-3 w-3 md:h-4 md:w-4 mr-1 fill-white" />
            Assistir
          </Button>
        </div>
      </div>

      {/* Title - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-gradient-to-t from-background to-transparent rounded-b-lg">
        <h3 className="font-semibold text-[10px] md:text-sm line-clamp-2 leading-tight">{content.title}</h3>
        {content.release_year && (
          <p className="text-[9px] md:text-xs text-muted-foreground mt-0.5">{content.release_year}</p>
        )}
      </div>
    </Link>
  );
}

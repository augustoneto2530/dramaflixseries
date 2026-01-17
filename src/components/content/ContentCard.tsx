import { Link } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import { Content, CATEGORY_LABELS, ContentCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

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
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Badges */}
      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
        {content.is_new && (
          <span className="category-badge bg-destructive/90 text-destructive-foreground text-[10px]">
            LANÇAMENTO
          </span>
        )}
        <span className={cn('category-badge text-[10px]', categoryStyles[content.category])}>
          {CATEGORY_LABELS[content.category]}
        </span>
      </div>

      {/* Rating Badge */}
      <div className="absolute top-2 right-2">
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5">
          <Star className="h-3 w-3 fill-accent text-accent" />
          <span className="text-xs font-medium">{content.rating}</span>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full brand-gradient flex items-center justify-center glow-primary">
            <Play className="h-6 w-6 text-white fill-white ml-1" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background to-transparent">
        <h3 className="font-semibold text-sm line-clamp-2">{content.title}</h3>
        {content.release_year && (
          <p className="text-xs text-muted-foreground mt-0.5">{content.release_year}</p>
        )}
      </div>
    </Link>
  );
}

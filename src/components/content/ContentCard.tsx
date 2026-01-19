import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import { Content, CATEGORY_LABELS, ContentCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useContentAccess } from '@/hooks/useContentAccess';
import { ContentAccessPopup } from './ContentAccessPopup';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkContentAccess, getBlockedReason } = useContentAccess();
  const [showAccessPopup, setShowAccessPopup] = useState(false);
  const [hasTrackedClick, setHasTrackedClick] = useState(false);
  
  const accessResult = checkContentAccess(content);
  const blockedReason = getBlockedReason(content);
  // Check if blocked but DO NOT show visual overlay - only popup on click
  const isBlocked = !accessResult.hasAccess && blockedReason;

  // Track click when card becomes visible/clicked
  const trackClick = async () => {
    if (hasTrackedClick) return;
    
    try {
      await supabase.from('content_clicks').insert({
        content_id: content.id,
        user_id: user?.id || null,
      });
      setHasTrackedClick(true);
    } catch (err) {
      console.error('Error tracking click:', err);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    trackClick();
    
    // If blocked, show popup instead of navigating
    if (isBlocked) {
      e.preventDefault();
      setShowAccessPopup(true);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          'content-card group block relative cursor-pointer',
          'aspect-[2/3]'
        )}
      >
        {/* Cover Image */}
        <img
          src={content.cover_image_url || '/placeholder.svg'}
          alt={content.title}
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
        />

        {/* No visual lock overlay - popup appears on click instead */}

        {/* Rating Badge - Top Right */}
        <div className="absolute top-1 right-1 md:top-2 md:right-2">
          <div className="flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-full px-1 py-0.5 md:px-1.5">
            <Star className="h-2 w-2 md:h-3 md:w-3 fill-accent text-accent" />
            <span className="text-[8px] md:text-[10px] font-medium">{content.rating}</span>
          </div>
        </div>

        {/* Category Badge - Top Left */}
        <div className="absolute top-1 left-1 md:top-2 md:left-2 flex flex-col gap-0.5">
          {content.is_new && (
            <span className="category-badge bg-destructive/90 text-destructive-foreground text-[6px] md:text-[8px] px-1 py-0.5 rounded">
              LANÇAMENTO
            </span>
          )}
          <span className={cn('category-badge text-[6px] md:text-[8px] px-1 py-0.5 rounded', categoryStyles[content.category])}>
            {CATEGORY_LABELS[content.category]}
          </span>
        </div>

        {/* Hover Overlay with Play Button - always show, popup appears on click if blocked */}
        <Link 
          to={isBlocked ? '#' : `/assistir/${content.id}`}
          onClick={handleClick}
          className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Button size="sm" className="brand-gradient glow-primary h-7 md:h-9 px-2 md:px-3 text-[10px] md:text-xs">
              <Play className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 fill-white" />
              Assistir
            </Button>
          </div>
        </Link>

        {/* Title - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-2 bg-gradient-to-t from-background via-background/80 to-transparent rounded-b-lg">
          <h3 className="font-medium text-[8px] md:text-[11px] line-clamp-2 leading-tight">{content.title}</h3>
          {content.release_year && (
            <p className="text-[7px] md:text-[9px] text-muted-foreground mt-0.5">{content.release_year}</p>
          )}
        </div>
      </div>

      {/* Access Popup */}
      <ContentAccessPopup
        open={showAccessPopup}
        onOpenChange={setShowAccessPopup}
        type={blockedReason || 'premium'}
      />
    </>
  );
}

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
  forceNew?: boolean;
}

const categoryStyles: Record<ContentCategory, string> = {
  doramas: 'category-doramas',
  adult: 'category-adult',
  novelas: 'category-novelas',
  filmes: 'category-filmes',
  series: 'category-series',
};

export function ContentCard({ content, variant = 'default', forceNew = false }: ContentCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkContentAccess, getBlockedReason, getPurchasedContentTitle, loading: accessLoading } = useContentAccess();
  const [showAccessPopup, setShowAccessPopup] = useState(false);
  const [hasTrackedClick, setHasTrackedClick] = useState(false);
  
  const accessResult = checkContentAccess(content);
  const blockedReason = getBlockedReason(content);
  // Don't treat as blocked while purchases are still loading — prevents the
  // wrong "buy +18" popup from flashing for users who already bought the avulso
  const isBlocked = !accessLoading && !accessResult.hasAccess && blockedReason;

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

        {/* Rating Badge - Top Right - Matching kdramatv.app style */}
        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10">
          <div className="flex items-center gap-0.5 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5">
            <Star className="h-2.5 w-2.5 md:h-3 md:w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] md:text-xs font-semibold text-white">{content.rating}</span>
          </div>
        </div>

        {/* Category/Tags Badge - Top Left - Matching kdramatv.app style */}
        <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 flex flex-col gap-1 z-10">
          {(content.is_new || forceNew) && (
            <span className="inline-block bg-red-500 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
              Lançamento
            </span>
          )}
          {/* Show first tag if exists - like DUBLADO, EXCLUSIVO */}
          {content.tags && content.tags.length > 0 && content.tags[0] && (
            <span className="inline-block bg-yellow-500 text-black text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
              {content.tags[0]}
            </span>
          )}
          <span className={cn(
            'inline-block text-[8px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded',
            categoryStyles[content.category]
          )}>
            {CATEGORY_LABELS[content.category]}
          </span>
        </div>

        {/* Hover Overlay with Play Button - matching kdramatv.app style */}
        <Link 
          to={isBlocked ? '#' : `/assistir/${content.id}`}
          onClick={handleClick}
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg flex items-center justify-center"
        >
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <Button size="sm" className="brand-gradient glow-primary h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm font-medium">
              <Play className="h-3 w-3 md:h-4 md:w-4 mr-1 fill-white" />
              Assistir
            </Button>
          </div>
        </Link>

        {/* Title - Bottom - Matching kdramatv.app style */}
        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-gradient-to-t from-black via-black/70 to-transparent rounded-b-lg">
          <h3 className="font-semibold text-[10px] md:text-sm text-white line-clamp-2 leading-snug">{content.title}</h3>
        </div>
      </div>

      {/* Access Popup */}
      <ContentAccessPopup
        open={showAccessPopup}
        onOpenChange={setShowAccessPopup}
        type={blockedReason || 'premium'}
        purchasedContentTitle={getPurchasedContentTitle()}
      />
    </>
  );
}

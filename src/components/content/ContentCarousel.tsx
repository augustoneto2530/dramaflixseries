import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentCard } from './ContentCard';
import { Content } from '@/lib/types';

interface ContentCarouselProps {
  title: string;
  contents: Content[];
  icon?: 'flame' | 'trending' | 'sparkles';
  mobileRows?: 1 | 2 | 4;
  forceNew?: boolean;
}

const icons = {
  flame: Flame,
  trending: TrendingUp,
  sparkles: Sparkles,
};

export function ContentCarousel({ title, contents, icon, mobileRows = 2, forceNew = false }: ContentCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const Icon = icon ? icons[icon] : null;

  if (contents.length === 0) return null;

  return (
    <section className="py-4 md:py-8">
      <div className="container mx-auto px-3 md:px-4">
        {/* Header - Matching kdramatv.app style */}
        <div className="flex items-center justify-between mb-3 md:mb-5">
          <div className="flex items-center gap-2 md:gap-3">
            {Icon && (
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                title === '+18'
                  ? 'bg-orange-950/60 border border-orange-800/40'
                  : icon === 'flame' 
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600' 
                    : 'brand-gradient'
              }`}>
                <Icon className={`h-5 w-5 md:h-6 md:w-6 ${
                  title === '+18' ? 'text-orange-400' : 'text-white'
                }`} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-lg md:text-2xl font-bold ${
                  title === '+18'
                    ? 'bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent'
                    : 'text-white'
                }`}>
                  {title === '+18' ? 'Conteúdo +18' : title}
                </h2>
                {title === '+18' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-700/80 text-orange-100 text-xs font-bold uppercase tracking-wide">
                    HOT
                  </span>
                )}
              </div>
              {title === '+18' && (
                <p className="text-sm text-muted-foreground mt-0.5">Conteúdo exclusivo para maiores de 18 anos</p>
              )}
            </div>
          </div>

          {/* Navigation Buttons - Desktop only - Matching kdramatv.app style */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-white/20 hover:border-white/40 hover:bg-white/10"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-white/20 hover:border-white/40 hover:bg-white/10"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Desktop Carousel - Single row horizontal scroll - Matching kdramatv.app */}
        <div
          ref={scrollRef}
          className="hidden md:flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory"
        >
          {contents.map((content) => (
            <div
              key={content.id}
              className="flex-shrink-0 w-[170px] lg:w-[200px] snap-start"
            >
              <ContentCard content={content} forceNew={forceNew} />
            </div>
          ))}
        </div>

        {/* Mobile Carousel - Variable row grid with horizontal scroll - Matching kdramatv.app */}
        <div className="md:hidden overflow-x-auto scrollbar-hide -mx-3 px-3">
          <div 
            className={`grid grid-flow-col gap-2.5 ${
              mobileRows === 1 || contents.length <= 2 ? 'grid-rows-1 auto-cols-[140px]' : 
              mobileRows === 4 && contents.length > 4 ? 'grid-rows-4 auto-cols-[120px]' : 
              contents.length <= 4 ? 'grid-rows-2 auto-cols-[130px]' :
              'grid-rows-2 auto-cols-[130px]'
            }`}
          >
            {contents.map((content) => (
              <div key={content.id}>
                <ContentCard content={content} forceNew={forceNew} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

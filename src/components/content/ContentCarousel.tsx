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
}

const icons = {
  flame: Flame,
  trending: TrendingUp,
  sparkles: Sparkles,
};

export function ContentCarousel({ title, contents, icon, mobileRows = 2 }: ContentCarouselProps) {
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
              <div className="w-7 h-7 md:w-9 md:h-9 rounded-full brand-gradient flex items-center justify-center shadow-lg">
                <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
              </div>
            )}
            <h2 className="text-base md:text-2xl font-bold text-white">{title}</h2>
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
              <ContentCard content={content} />
            </div>
          ))}
        </div>

        {/* Mobile Carousel - Variable row grid with horizontal scroll - Matching kdramatv.app */}
        <div className="md:hidden overflow-x-auto scrollbar-hide -mx-3 px-3">
          <div 
            className={`grid grid-flow-col gap-2.5 ${
              mobileRows === 1 ? 'grid-rows-1 auto-cols-[140px]' : 
              mobileRows === 4 ? 'grid-rows-4 auto-cols-[120px]' : 
              'grid-rows-2 auto-cols-[130px]'
            }`}
          >
            {contents.map((content) => (
              <div key={content.id}>
                <ContentCard content={content} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

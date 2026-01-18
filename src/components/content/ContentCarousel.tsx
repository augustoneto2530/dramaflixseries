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
    <section className="py-3 md:py-6">
      <div className="container mx-auto px-3 md:px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full brand-gradient flex items-center justify-center">
                <Icon className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
            )}
            <h2 className="text-sm md:text-xl font-bold">{title}</h2>
          </div>

          {/* Navigation Buttons - Desktop only */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Carousel - Single row horizontal scroll */}
        <div
          ref={scrollRef}
          className="hidden md:flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory"
        >
          {contents.map((content) => (
            <div
              key={content.id}
              className="flex-shrink-0 w-[160px] lg:w-[180px] snap-start"
            >
              <ContentCard content={content} />
            </div>
          ))}
        </div>

        {/* Mobile Carousel - Variable row grid with horizontal scroll */}
        <div className="md:hidden overflow-x-auto scrollbar-hide -mx-3 px-3">
          <div 
            className={`grid grid-flow-col gap-2 auto-cols-[120px] ${
              mobileRows === 1 ? 'grid-rows-1' : 
              mobileRows === 4 ? 'grid-rows-4' : 
              'grid-rows-2'
            }`}
          >
            {contents.map((content) => (
              <div key={content.id} className="w-[120px]">
                <ContentCard content={content} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

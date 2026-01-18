import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentCard } from './ContentCard';
import { Content } from '@/lib/types';

interface ContentCarouselProps {
  title: string;
  contents: Content[];
  icon?: 'flame' | 'trending' | 'sparkles';
}

const icons = {
  flame: Flame,
  trending: TrendingUp,
  sparkles: Sparkles,
};

export function ContentCarousel({ title, contents, icon }: ContentCarouselProps) {
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
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full brand-gradient flex items-center justify-center">
                <Icon className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
            )}
            <h2 className="text-base md:text-xl font-bold">{title}</h2>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="hidden md:flex h-8 w-8"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden md:flex h-8 w-8"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-3 px-3 md:-mx-4 md:px-4 snap-x snap-mandatory"
        >
          {contents.map((content) => (
            <div
              key={content.id}
              className="flex-shrink-0 w-[100px] sm:w-[120px] md:w-[160px] lg:w-[180px] snap-start"
            >
              <ContentCard content={content} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

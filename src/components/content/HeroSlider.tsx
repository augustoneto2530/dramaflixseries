import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Plus, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Content, CATEGORY_LABELS, ContentCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

interface HeroSliderProps {
  contents: Content[];
}

const categoryStyles: Record<ContentCategory, string> = {
  doramas: 'category-doramas',
  adult: 'category-adult',
  novelas: 'category-novelas',
  filmes: 'category-filmes',
  series: 'category-series',
};

export function HeroSlider({ contents }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (contents.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % contents.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [contents.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + contents.length) % contents.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % contents.length);
  };

  if (contents.length === 0) return null;

  const currentContent = contents[currentIndex];

  return (
    <section className="relative h-[50vh] min-h-[300px] md:h-[70vh] md:min-h-[500px] max-h-[800px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-background">
        <img
          src={currentContent.banner_image_url || currentContent.cover_image_url || '/placeholder.svg'}
          alt={currentContent.title}
          className="w-full h-full object-contain transition-opacity duration-500"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="hero-overlay-bottom absolute inset-0" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 h-full flex items-end md:items-center pb-16 md:pb-0">
        <div className="max-w-2xl animate-fade-up">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-2 md:mb-4">
            <span className="inline-flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full brand-gradient text-xs md:text-sm font-medium text-white">
              <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
              Em Destaque
            </span>
            {currentContent.release_year && (
              <span className="text-xs md:text-sm text-muted-foreground">
                {currentContent.release_year}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold mb-2 md:mb-4 text-balance leading-tight">
            {currentContent.title}
          </h1>

          {/* Description - Hidden on small mobile */}
          {currentContent.description && (
            <p className="hidden sm:block text-muted-foreground text-sm md:text-lg mb-2 md:mb-4 line-clamp-2">
              {currentContent.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 md:h-5 md:w-5 fill-accent text-accent" />
              <span className="font-semibold text-sm md:text-base">{currentContent.rating}</span>
              <span className="text-muted-foreground text-sm">/10</span>
            </div>
            <span className={cn('category-badge text-[10px] md:text-xs', categoryStyles[currentContent.category])}>
              {CATEGORY_LABELS[currentContent.category]}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link to={`/assistir/${currentContent.id}`}>
              <Button size="default" className="brand-gradient glow-primary h-9 md:h-11 px-4 md:px-6 text-sm md:text-base">
                <Play className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2 fill-white" />
                Assistir Agora
              </Button>
            </Link>
            <Button size="default" variant="outline" className="h-9 md:h-11 px-3 md:px-4 text-sm md:text-base">
              <Plus className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Minha Lista</span>
              <span className="sm:hidden">Lista</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows - Hidden on mobile */}
      {contents.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-sm"
            onClick={goToPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-sm"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Dots */}
      {contents.length > 1 && (
        <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:gap-2">
          {contents.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'h-1.5 md:h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-6 md:w-8 brand-gradient'
                  : 'w-1.5 md:w-2 bg-foreground/30 hover:bg-foreground/50'
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Sparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

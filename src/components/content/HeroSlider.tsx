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
    <section className="relative h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={currentContent.banner_image_url || currentContent.cover_image_url || '/placeholder.svg'}
          alt={currentContent.title}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="hero-overlay-bottom absolute inset-0" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl animate-fade-up">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full brand-gradient text-sm font-medium text-white">
              <Sparkles className="h-4 w-4" />
              Em Destaque
            </span>
            {currentContent.release_year && (
              <span className="text-sm text-muted-foreground">
                {currentContent.release_year}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-balance">
            {currentContent.title}
          </h1>

          {/* Description */}
          {currentContent.description && (
            <p className="text-muted-foreground text-lg mb-4 line-clamp-2">
              {currentContent.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-accent text-accent" />
              <span className="font-semibold">{currentContent.rating}</span>
              <span className="text-muted-foreground">/10</span>
            </div>
            <span className={cn('category-badge', categoryStyles[currentContent.category])}>
              {CATEGORY_LABELS[currentContent.category]}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link to={`/assistir/${currentContent.id}`}>
              <Button size="lg" className="brand-gradient glow-primary">
                <Play className="h-5 w-5 mr-2 fill-white" />
                Assistir Agora
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              <Plus className="h-5 w-5 mr-2" />
              Minha Lista
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {contents.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-sm"
            onClick={goToPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-sm"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Dots */}
      {contents.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {contents.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-8 brand-gradient'
                  : 'bg-foreground/30 hover:bg-foreground/50'
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

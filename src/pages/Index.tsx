import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { HeroSlider } from '@/components/content/HeroSlider';
import { ContentCarousel } from '@/components/content/ContentCarousel';
import { Content } from '@/lib/types';

// Dados de demonstração - serão substituídos por dados do banco
const demoContents: Content[] = [
  {
    id: '1',
    title: 'LIGADA A HONRA',
    description: 'Drama de honra e amor',
    category: 'doramas',
    cover_image_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
    banner_image_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&h=1080&fit=crop',
    rating: 8.5,
    release_year: 2025,
    is_featured: true,
    is_trending: true,
    is_new: true,
    is_adult: false,
    total_episodes: 16,
    duration_minutes: null,
    tags: ['romance', 'drama'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'A RAINHA DO SÉCULO 21',
    description: 'Uma rainha renascida no século 21',
    category: 'doramas',
    cover_image_url: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400&h=600&fit=crop',
    banner_image_url: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=1920&h=1080&fit=crop',
    rating: 9.0,
    release_year: 2025,
    is_featured: true,
    is_trending: false,
    is_new: false,
    is_adult: false,
    total_episodes: 20,
    duration_minutes: null,
    tags: ['fantasia', 'comédia'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'AMOR EM COLAPSO',
    description: 'Uma história de amor impossível',
    category: 'novelas',
    cover_image_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop',
    banner_image_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&h=1080&fit=crop',
    rating: 8.0,
    release_year: 2024,
    is_featured: false,
    is_trending: true,
    is_new: true,
    is_adult: false,
    total_episodes: 150,
    duration_minutes: null,
    tags: ['romance', 'drama'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'ZOOTOPIA 2',
    description: 'A aventura continua',
    category: 'filmes',
    cover_image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
    banner_image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&h=1080&fit=crop',
    rating: 9.5,
    release_year: 2025,
    is_featured: true,
    is_trending: true,
    is_new: true,
    is_adult: false,
    total_episodes: 1,
    duration_minutes: 120,
    tags: ['animação', 'aventura'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'COMO DOMAR UM COROA',
    description: 'Comédia romântica imperdível',
    category: 'doramas',
    cover_image_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&h=600&fit=crop',
    banner_image_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=1920&h=1080&fit=crop',
    rating: 8.5,
    release_year: 2024,
    is_featured: false,
    is_trending: true,
    is_new: false,
    is_adult: false,
    total_episodes: 12,
    duration_minutes: null,
    tags: ['comédia', 'romance'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    title: 'CONTRATADA PARA OBEDECER',
    description: 'Contrato que vira amor',
    category: 'adult',
    cover_image_url: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=400&h=600&fit=crop',
    banner_image_url: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=1920&h=1080&fit=crop',
    rating: 8.0,
    release_year: 2024,
    is_featured: true,
    is_trending: false,
    is_new: false,
    is_adult: true,
    total_episodes: 1,
    duration_minutes: 95,
    tags: ['romance', 'drama'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '7',
    title: 'BREAKING BAD',
    description: 'Um professor de química se torna o maior fabricante de metanfetamina',
    category: 'series',
    cover_image_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=600&fit=crop',
    banner_image_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1920&h=1080&fit=crop',
    rating: 9.8,
    release_year: 2013,
    is_featured: false,
    is_trending: true,
    is_new: false,
    is_adult: false,
    total_episodes: 62,
    duration_minutes: null,
    tags: ['drama', 'crime'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '8',
    title: 'ENCONTREI UM MARIDO BILIONÁRIO',
    description: 'Uma história de amor inesperada',
    category: 'series',
    cover_image_url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=600&fit=crop',
    banner_image_url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1920&h=1080&fit=crop',
    rating: 9.0,
    release_year: 2025,
    is_featured: false,
    is_trending: true,
    is_new: true,
    is_adult: false,
    total_episodes: 80,
    duration_minutes: null,
    tags: ['romance', 'comédia'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function Index() {
  const [featuredContents, setFeaturedContents] = useState<Content[]>([]);
  const [trendingContents, setTrendingContents] = useState<Content[]>([]);
  const [newContents, setNewContents] = useState<Content[]>([]);
  const [doramasContents, setDoramasContents] = useState<Content[]>([]);
  const [filmesContents, setFilmesContents] = useState<Content[]>([]);
  const [seriesContents, setSeriesContents] = useState<Content[]>([]);

  useEffect(() => {
    // Por enquanto usando dados demo, depois conectar com Supabase
    setFeaturedContents(demoContents.filter(c => c.is_featured));
    setTrendingContents(demoContents.filter(c => c.is_trending));
    setNewContents(demoContents.filter(c => c.is_new));
    setDoramasContents(demoContents.filter(c => c.category === 'doramas'));
    setFilmesContents(demoContents.filter(c => c.category === 'filmes'));
    setSeriesContents(demoContents.filter(c => c.category === 'series'));
  }, []);

  return (
    <Layout>
      {/* Hero Slider */}
      <HeroSlider contents={featuredContents} />

      {/* Content Sections */}
      <div className="space-y-2 pb-12">
        <ContentCarousel
          title="Em Alta"
          contents={trendingContents}
          icon="flame"
        />

        <ContentCarousel
          title="Lançamentos"
          contents={newContents}
          icon="sparkles"
        />

        <ContentCarousel
          title="Doramas"
          contents={doramasContents}
        />

        <ContentCarousel
          title="Filmes"
          contents={filmesContents}
        />

        <ContentCarousel
          title="Séries"
          contents={seriesContents}
        />
      </div>
    </Layout>
  );
}

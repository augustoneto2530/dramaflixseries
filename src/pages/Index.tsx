import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { HeroSlider } from '@/components/content/HeroSlider';
import { ContentCarousel } from '@/components/content/ContentCarousel';
import { Content } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const [allContents, setAllContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContents = async () => {
      try {
        const { data, error } = await supabase
          .from('contents')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching contents:', error);
          return;
        }

        if (data) {
          setAllContents(data as Content[]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, []);

  // Filter contents by category and flags
  const featuredContents = allContents.filter(c => c.is_featured);
  const trendingContents = allContents.filter(c => c.is_trending);
  const newContents = allContents.filter(c => c.is_new);
  const doramasContents = allContents.filter(c => c.category === 'doramas');
  const seriesContents = allContents.filter(c => c.category === 'series');
  const filmesContents = allContents.filter(c => c.category === 'filmes');
  const adultContents = allContents.filter(c => c.category === 'adult');

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Slider */}
      <HeroSlider contents={featuredContents.length > 0 ? featuredContents : allContents.slice(0, 5)} />

      {/* Content Sections */}
      <div className="space-y-0 pb-20 md:pb-12">
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
          title="Séries"
          contents={seriesContents}
        />

        <ContentCarousel
          title="Filmes"
          contents={filmesContents}
          mobileRows={1}
        />

        <ContentCarousel
          title="+18"
          contents={adultContents}
          mobileRows={4}
        />
      </div>
    </Layout>
  );
}

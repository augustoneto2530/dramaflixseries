import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { HeroSlider } from '@/components/content/HeroSlider';
import { ContentCarousel } from '@/components/content/ContentCarousel';
import { Content } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { user } = useAuth();
  const [allContents, setAllContents] = useState<Content[]>([]);
  const [purchasedContents, setPurchasedContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all contents and purchased contents in parallel for faster loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Run both queries in parallel
        const [contentsResult, purchasesResult] = await Promise.all([
          supabase
            .from('contents')
            .select('*')
            .order('created_at', { ascending: false }),
          user
            ? supabase
                .from('user_content_purchases')
                .select('content_id, contents(*)')
                .eq('user_id', user.id)
            : Promise.resolve({ data: null, error: null })
        ]);

        if (contentsResult.error) {
          console.error('Error fetching contents:', contentsResult.error);
        } else if (contentsResult.data) {
          setAllContents(contentsResult.data as Content[]);
        }

        // Process purchased contents immediately from the join query
        if (purchasesResult.data && purchasesResult.data.length > 0) {
          const purchased = purchasesResult.data
            .map((p: any) => p.contents)
            .filter(Boolean) as Content[];
          setPurchasedContents(purchased);
        } else {
          setPurchasedContents([]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

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
        {/* Show purchased content first if user has any */}
        {purchasedContents.length > 0 && (
          <ContentCarousel
            title="Seus Conteúdos"
            contents={purchasedContents}
            icon="sparkles"
          />
        )}

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

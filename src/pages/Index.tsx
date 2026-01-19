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

  // Filter contents by category and flags - matching kdramatv.app order
  const featuredContents = allContents.filter(c => c.is_featured);
  const adultContents = allContents.filter(c => c.category === 'adult');
  const nonAdultTrending = allContents.filter(c => c.is_trending && c.category !== 'adult');
  
  // Em Alta = Custom order: "A Esposa Virgem do Mafioso" first, "Ligada a Honra" second, then adult contents, then other trending
  const priorityTitles = ['a esposa virgem do mafioso', 'ligada a honra'];
  const sortedTrendingContents = [...adultContents, ...nonAdultTrending].sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aIndex = priorityTitles.findIndex(t => aTitle.includes(t));
    const bIndex = priorityTitles.findIndex(t => bTitle.includes(t));
    
    // If both have priority, sort by priority order
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    // If only a has priority, a comes first
    if (aIndex !== -1) return -1;
    // If only b has priority, b comes first
    if (bIndex !== -1) return 1;
    // Otherwise maintain original order
    return 0;
  });
  const trendingContents = sortedTrendingContents;
  
  const newContents = allContents.filter(c => c.is_new);
  const doramasContents = allContents.filter(c => c.category === 'doramas');
  const seriesContents = allContents.filter(c => c.category === 'series');
  const filmesContents = allContents.filter(c => c.category === 'filmes');
  const novelasContents = allContents.filter(c => c.category === 'novelas');

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

      {/* Content Sections - Order matching kdramatv.app */}
      <div className="space-y-0 pb-20 md:pb-12">
        {/* Show purchased content first if user has any */}
        {purchasedContents.length > 0 && (
          <ContentCarousel
            title="Seus Conteúdos"
            contents={purchasedContents}
            icon="sparkles"
          />
        )}

        {/* Em Alta (Trending) - First section like kdramatv.app */}
        <ContentCarousel
          title="Em Alta"
          contents={trendingContents.length > 0 ? trendingContents : allContents.slice(0, 10)}
          icon="flame"
        />

        {/* Lançamentos (New Releases) */}
        <ContentCarousel
          title="Lançamentos"
          contents={newContents.length > 0 ? newContents : allContents.filter(c => c.is_new).slice(0, 10)}
          icon="sparkles"
        />

        {/* Doramas */}
        <ContentCarousel
          title="Doramas"
          contents={doramasContents}
        />

        {/* Séries */}
        <ContentCarousel
          title="Séries"
          contents={seriesContents}
        />

        {/* Filmes - Single row on mobile like kdramatv.app */}
        <ContentCarousel
          title="Filmes"
          contents={filmesContents}
          mobileRows={1}
        />

        {/* Novelas */}
        {novelasContents.length > 0 && (
          <ContentCarousel
            title="Novelas"
            contents={novelasContents}
          />
        )}

        {/* +18 - 4 rows on mobile for massive catalog */}
        <ContentCarousel
          title="+18"
          contents={adultContents}
          mobileRows={4}
        />
      </div>
    </Layout>
  );
}

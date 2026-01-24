import { useState, useEffect, useMemo } from 'react';
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
  const [loadingContents, setLoadingContents] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Fetch all contents immediately (no dependency on user)
  useEffect(() => {
    const fetchContents = async () => {
      try {
        const { data, error } = await supabase
          .from('contents')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching contents:', error);
        } else if (data) {
          setAllContents(data as Content[]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingContents(false);
      }
    };

    fetchContents();
  }, []);

  // Fetch purchased contents immediately when user is available (separate effect)
  useEffect(() => {
    if (!user) {
      setPurchasedContents([]);
      return;
    }

    const fetchPurchases = async () => {
      setLoadingPurchases(true);
      try {
        const { data, error } = await supabase
          .from('user_content_purchases')
          .select('content_id, contents(*)')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching purchases:', error);
        } else if (data && data.length > 0) {
          const purchased = data
            .map((p: any) => p.contents)
            .filter(Boolean) as Content[];
          setPurchasedContents(purchased);
        } else {
          setPurchasedContents([]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingPurchases(false);
      }
    };

    fetchPurchases();
  }, [user]);

  // Memoize filtered contents for performance
  const { heroContents, trendingContents, newContents, doramasContents, seriesContents, filmesContents, novelasContents, adultContents } = useMemo(() => {
    // Hero Slider: 6 specific titles in exact order from reference image
    const heroTitles = [
      'excitar a esposa virgem do mafioso',
      'sou obsessão mais perigosa dela',
      'o limite',
      'ligada a honra',
      'contratada para obedecer',
      'curiosa'
    ];
    
    const heroSorted = heroTitles
      .map(title => allContents.find(c => c.title.toLowerCase().includes(title)))
      .filter(Boolean) as Content[];
    
    const featured = allContents.filter(c => c.is_featured);
    const adult = allContents.filter(c => c.category === 'adult');
    const nonAdultTrending = allContents.filter(c => c.is_trending && c.category !== 'adult');
    
    const priorityTitles = [
      'excitar a esposa virgem do mafioso',
      'ligada a honra',
      'obsessão mais perigosa',
      'contratada para obedecer',
      'o limite',
      'curiosa',
      'doce tentação',
      'o preço do prazer',
      '365 dias',
      'um amor arriscado demais para resistir',
      'procura-se namorada',
      'jogos psicológicos',
      'o lado bom de ser traída',
      'amor sem limites',
      'tentação perigosa',
      'banho gelado',
      'serviço de quarto'
    ];
    const sortedTrending = [...adult, ...nonAdultTrending].sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aIndex = priorityTitles.findIndex(t => aTitle.includes(t));
      const bIndex = priorityTitles.findIndex(t => bTitle.includes(t));
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });

    return {
      heroContents: heroSorted.length > 0 ? heroSorted : featured.slice(0, 4),
      trendingContents: sortedTrending,
      newContents: allContents.filter(c => c.is_new),
      doramasContents: allContents.filter(c => c.category === 'doramas'),
      seriesContents: allContents.filter(c => c.category === 'series'),
      filmesContents: allContents.filter(c => c.category === 'filmes'),
      novelasContents: allContents.filter(c => c.category === 'novelas'),
      adultContents: adult
    };
  }, [allContents]);

  if (loadingContents) {
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
      {/* Hero Slider - 4 specific series in order */}
      <HeroSlider contents={heroContents} />

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

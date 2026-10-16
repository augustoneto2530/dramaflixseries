import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { HeroSlider } from '@/components/content/HeroSlider';
import { ContentCarousel } from '@/components/content/ContentCarousel';
import { Content } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PROFESSORA_MIA_CONTENT_ID, prioritizeProfessoraMia, useContentsQuery } from '@/hooks/useContentsQuery';

export default function Index() {
  const { user } = useAuth();
  const { data: allContents = [], isLoading: loadingContents } = useContentsQuery();

  const { data: purchasedContents = [] } = useQuery({
    queryKey: ['purchased-contents', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_content_purchases')
        .select('content_id, contents(*)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data || []).map((p: any) => p.contents).filter(Boolean) as Content[];
    },
  });


  // Memoize filtered contents for performance
  const { heroContents, trendingContents, newContents, doramasContents, seriesContents, filmesContents, novelasContents, adultContents } = useMemo(() => {
    // Hero Slider: 7 specific titles in exact order from reference image
    const professoraMia = allContents.find(c => c.id === PROFESSORA_MIA_CONTENT_ID);
    const castigadoPelaMadrasta = allContents.find(c => c.id === 'f1746685-58c6-4c55-a8c3-9bb0114dc83f');
    const heroTitles = [
      'o filho do meu marido',
      'de repente casados',
      'excitar a esposa virgem do mafioso',
      'sou obsessão mais perigosa dela',
      'o limite',
      'ligada a honra',
      'contratada para obedecer',
      'curiosa',
      '365 dias'
    ];
    
    void heroTitles;
    const heroIds = [
      '1a2b1e56-ed07-4c79-b6b9-be0f6ba70943',
      '9aa670dd-725f-4c79-8eb2-2046bc7456c4',
      'f1746685-58c6-4c55-a8c3-9bb0114dc83f',
      '63193d97-be09-4b86-b594-a3a68baca3e2',
      'dc85415b-45a9-4ec5-8864-d611b65d59b2',
      'a46d57ec-b91e-4a63-8b9a-7a7228c74289',
      '1a9ae9dd-affd-4eed-85e2-d72c030bb57d',
      '591c49e4-04dd-4ea2-9773-c85057d054fe',
      '6084c12a-635e-4feb-b62c-db1eb68f3acf',
      'f81aa496-708e-4154-99b7-1148f4f91f77',
    ];
    const heroSorted = heroIds
      .map(id => allContents.find(c => c.id === id))
      .filter(Boolean) as Content[];
    
    const featured = allContents.filter(c => c.is_featured);
    const adult = allContents.filter(c => c.category === 'adult' || c.is_adult);
    const nonAdultTrending = allContents.filter(c => c.is_trending && c.category !== 'adult');
    
    const priorityTitles = [
      'o filho do meu marido',
      'de repente casados',
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
    const sortByPriority = (a: Content, b: Content) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aIndex = priorityTitles.findIndex(t => aTitle.includes(t));
      const bIndex = priorityTitles.findIndex(t => bTitle.includes(t));
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    };

    // Remove duplicados (mesmo id ou mesmo título) de qualquer lista
    const dedupe = (list: Content[]) => {
      const seenIds = new Set<string>();
      const seenTitles = new Set<string>();
      return list.filter(c => {
        const key = (c.title || '').trim().toLowerCase();
        if (seenIds.has(c.id) || (key && seenTitles.has(key))) return false;
        seenIds.add(c.id);
        if (key) seenTitles.add(key);
        return true;
      });
    };

    const sortedTrending = prioritizeProfessoraMia(dedupe([...adult, ...nonAdultTrending].sort(sortByPriority)));
    const sortedAdult = prioritizeProfessoraMia(dedupe([...adult].sort(sortByPriority)));

    const prioritizedCategory = (list: Content[]) => prioritizeProfessoraMia(dedupe([
      ...(professoraMia ? [professoraMia] : []),
      ...list,
    ]));

    return {
      heroContents: dedupe(heroSorted).length > 0 ? dedupe(heroSorted) : dedupe(featured).slice(0, 4),
      trendingContents: dedupe([
        ...(castigadoPelaMadrasta ? [castigadoPelaMadrasta] : []),
        ...sortedTrending,
      ]),
      newContents: prioritizedCategory(allContents.filter(c => c.is_new)),
      doramasContents: prioritizedCategory(allContents.filter(c => c.category === 'doramas')),
      seriesContents: prioritizedCategory(allContents.filter(c => c.category === 'series')),
      filmesContents: prioritizedCategory(allContents.filter(c => c.category === 'filmes')),
      novelasContents: prioritizedCategory(allContents.filter(c => c.category === 'novelas')),
      adultContents: sortedAdult
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
          forceNew
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
          icon="flame"
        />
      </div>
    </Layout>
  );
}

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

  // Fetch user's purchased content
  useEffect(() => {
    const fetchPurchasedContents = async () => {
      if (!user) {
        setPurchasedContents([]);
        return;
      }

      try {
        const { data: purchases, error } = await supabase
          .from('user_content_purchases')
          .select('content_id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching purchases:', error);
          return;
        }

        if (purchases && purchases.length > 0) {
          const contentIds = purchases.map(p => p.content_id);
          const purchasedItems = allContents.filter(c => contentIds.includes(c.id));
          setPurchasedContents(purchasedItems);
        } else {
          setPurchasedContents([]);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    if (allContents.length > 0) {
      fetchPurchasedContents();
    }
  }, [user, allContents]);

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

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ContentCard } from '@/components/content/ContentCard';
import { Content, ContentCategory } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Heart, Film, Tv, Sparkles } from 'lucide-react';

const categoryConfig: Record<string, { title: string; icon: React.ReactNode; description: string }> = {
  doramas: {
    title: 'Doramas',
    icon: <Heart className="h-8 w-8" />,
    description: 'Os melhores doramas asiáticos para você maratonar',
  },
  adult: {
    title: '+18',
    icon: <Flame className="h-8 w-8" />,
    description: 'Conteúdo exclusivo para maiores de 18 anos',
  },
  novelas: {
    title: 'Novelas',
    icon: <Tv className="h-8 w-8" />,
    description: 'As novelas mais emocionantes e envolventes',
  },
  filmes: {
    title: 'Filmes',
    icon: <Film className="h-8 w-8" />,
    description: 'Filmes incríveis para todos os gostos',
  },
  series: {
    title: 'Séries',
    icon: <Sparkles className="h-8 w-8" />,
    description: 'As melhores séries do momento',
  },
};

export default function Category() {
  const { category } = useParams<{ category: string }>();
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const config = category ? categoryConfig[category] : null;

  useEffect(() => {
    const fetchContents = async () => {
      if (!category) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('contents')
          .select('*')
          .eq('category', category as ContentCategory)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching contents:', error);
          return;
        }

        if (data) {
          setContents(data as Content[]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, [category]);

  if (!config) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Categoria não encontrada</h1>
            <p className="text-muted-foreground">A categoria solicitada não existe.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Header da Categoria */}
        <div className="relative py-16 md:py-24">
          <div className="absolute inset-0 brand-gradient opacity-10" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl brand-gradient text-white">
                {config.icon}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">{config.title}</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl">
              {config.description}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {contents.length} título{contents.length !== 1 ? 's' : ''} disponíve{contents.length !== 1 ? 'is' : 'l'}
            </p>
          </div>
        </div>

        {/* Grid de Conteúdos */}
        <div className="container mx-auto px-4 pb-20">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : contents.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                Nenhum conteúdo encontrado nesta categoria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {contents.map((content) => (
                <ContentCard key={content.id} content={content} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

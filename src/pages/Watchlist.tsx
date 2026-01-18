import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ContentCard } from '@/components/content/ContentCard';
import { Content } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bookmark, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Watchlist() {
  const { user, isLoading: authLoading } = useAuth();
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First get watchlist items
        const { data: watchlistData, error: watchlistError } = await supabase
          .from('user_watchlist')
          .select('content_id')
          .eq('user_id', user.id);

        if (watchlistError) {
          console.error('Error fetching watchlist:', watchlistError);
          return;
        }

        if (watchlistData && watchlistData.length > 0) {
          const contentIds = watchlistData.map(item => item.content_id);
          
          // Then get content details
          const { data: contentsData, error: contentsError } = await supabase
            .from('contents')
            .select('*')
            .in('id', contentIds);

          if (contentsError) {
            console.error('Error fetching contents:', contentsError);
            return;
          }

          if (contentsData) {
            setContents(contentsData as Content[]);
          }
        } else {
          setContents([]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchWatchlist();
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center py-20">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <LogIn className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Faça login para ver sua lista</h1>
            <p className="text-muted-foreground mb-8">
              Você precisa estar logado para acessar sua lista de conteúdos salvos.
            </p>
            <Link to="/entrar">
              <Button className="brand-gradient glow-primary">
                Fazer Login
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl brand-gradient text-white">
                <Bookmark className="h-8 w-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">Minha Lista</h1>
            </div>
            <p className="text-xl text-muted-foreground">
              Seus conteúdos salvos para assistir depois
            </p>
          </div>

          {/* Content Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : contents.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <Bookmark className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Sua lista está vazia</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Adicione conteúdos à sua lista clicando no botão "+ Minha Lista" nos títulos que você deseja assistir depois.
              </p>
              <Link to="/">
                <Button className="brand-gradient glow-primary">
                  Explorar Conteúdos
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                {contents.length} título{contents.length !== 1 ? 's' : ''} na sua lista
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {contents.map((content) => (
                  <ContentCard key={content.id} content={content} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

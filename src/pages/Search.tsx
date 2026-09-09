import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ContentCard } from '@/components/content/ContentCard';
import { Content } from '@/lib/types';
import { useContentsQuery, dedupeContents } from '@/hooks/useContentsQuery';
import { Search as SearchIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchTerm, setSearchTerm] = useState(query);
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchContents = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('contents')
          .select('*')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error searching contents:', error);
          return;
        }

        if (data) {
          const seenIds = new Set<string>();
          const seenTitles = new Set<string>();
          setResults((data as Content[]).filter((c) => {
            const key = (c.title || '').trim().toLowerCase();
            if (seenIds.has(c.id) || (key && seenTitles.has(key))) return false;
            seenIds.add(c.id);
            if (key) seenTitles.add(key);
            return true;
          }));
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    searchContents();
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchParams({});
    setResults([]);
  };

  return (
    <Layout>
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          {/* Search Header */}
          <div className="max-w-2xl mx-auto mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">
              Buscar <span className="brand-gradient-text">Conteúdos</span>
            </h1>

            <form onSubmit={handleSearch} className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar doramas, séries, filmes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-24 py-6 text-lg bg-card border-border"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-20 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
              <Button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 brand-gradient"
              >
                Buscar
              </Button>
            </form>
          </div>

          {/* Results */}
          {query && (
            <div className="mb-8">
              <p className="text-muted-foreground">
                {loading ? (
                  'Buscando...'
                ) : (
                  <>
                    {results.length} resultado{results.length !== 1 ? 's' : ''} para "{query}"
                  </>
                )}
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {results.map((content) => (
                <ContentCard key={content.id} content={content} />
              ))}
            </div>
          ) : query ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <SearchIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Nenhum resultado encontrado</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Não encontramos nenhum conteúdo para "{query}". Tente buscar por outro termo.
              </p>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <SearchIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Busque por conteúdos</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Digite o nome do dorama, série ou filme que você está procurando.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

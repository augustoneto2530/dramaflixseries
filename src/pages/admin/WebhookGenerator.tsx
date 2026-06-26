import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, Copy, Check, FileText, Link2, ExternalLink, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Content } from '@/lib/types';

export default function AdminWebhookGenerator() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contents, setContents] = useState<Content[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingContents, setIsLoadingContents] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate('/entrar');
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchContents();
  }, [isAdmin]);

  const fetchContents = async () => {
    setIsLoadingContents(true);
    try {
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      setContents((data || []) as Content[]);
    } catch (err) {
      console.error('Error fetching contents:', err);
      toast({ title: 'Erro', description: 'Erro ao carregar conteúdos', variant: 'destructive' });
    } finally {
      setIsLoadingContents(false);
    }
  };

  const getWebhookUrl = (contentId: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-single-content?content_id=${contentId}`;
  };

  const copyWebhookUrl = (contentId: string, contentTitle: string) => {
    const url = getWebhookUrl(contentId);
    navigator.clipboard.writeText(url);
    setCopiedId(contentId);
    toast({ title: 'URL copiada!', description: `Webhook de "${contentTitle}" copiado para a área de transferência` });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredContents = contents.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'adult': return 'bg-category-adult text-white';
      case 'doramas': return 'bg-category-doramas text-white';
      case 'series': return 'bg-category-series text-white';
      case 'filmes': return 'bg-category-filmes text-white';
      case 'novelas': return 'bg-category-novelas text-white';
      default: return 'bg-muted';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'adult': return '+18';
      case 'doramas': return 'Dorama';
      case 'series': return 'Série';
      case 'filmes': return 'Filme';
      case 'novelas': return 'Novela';
      default: return category;
    }
  };

  if (isLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Gerador de Webhooks</h1>
                <p className="text-sm text-muted-foreground">Crie webhooks para venda de conteúdos individuais</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Card */}
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Como funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Encontre o conteúdo que deseja vender individualmente</p>
            <p>2. Clique em <strong>"Copiar URL"</strong> para copiar o webhook específico</p>
            <p>3. Configure este URL na sua plataforma de pagamento (Hotmart, Monetizze, etc.)</p>
            <p>4. Quando uma compra for confirmada, o usuário receberá acesso apenas a este conteúdo</p>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conteúdo por título..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Contents List */}
        {isLoadingContents ? (
          <div className="text-center py-12 text-muted-foreground">Carregando conteúdos...</div>
        ) : filteredContents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum conteúdo encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredContents.map((content) => (
              <Card key={content.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-16 h-24 rounded-md overflow-hidden bg-muted">
                      {content.cover_image_url ? (
                        <img
                          src={content.cover_image_url}
                          alt={content.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{content.title}</h3>
                        <Badge className={getCategoryBadgeColor(content.category)}>
                          {content.is_adult && <Flame className="h-3 w-3 mr-1" />}
                          {getCategoryLabel(content.category)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        ID: {content.id}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[10px] bg-muted px-2 py-1 rounded truncate max-w-[300px] md:max-w-[500px]">
                          {getWebhookUrl(content.id)}
                        </code>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => copyWebhookUrl(content.id, content.title)}
                        className="gap-1"
                      >
                        {copiedId === content.id ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copiar URL
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link to={`/assistir/${content.id}`} className="gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Ver Conteúdo
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{contents.length}</p>
              <p className="text-sm text-muted-foreground">Total de Conteúdos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-category-adult">
                {contents.filter(c => c.is_adult).length}
              </p>
              <p className="text-sm text-muted-foreground">Conteúdos +18</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-category-doramas">
                {contents.filter(c => c.category === 'doramas').length}
              </p>
              <p className="text-sm text-muted-foreground">Doramas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-category-filmes">
                {contents.filter(c => c.category === 'filmes').length}
              </p>
              <p className="text-sm text-muted-foreground">Filmes</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

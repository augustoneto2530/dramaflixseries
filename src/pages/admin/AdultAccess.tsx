import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, Flame, User, CheckCircle, XCircle, Copy, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Profile, PurchaseWebhook } from '@/lib/types';

export default function AdminAdultAccess() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adultWebhooks, setAdultWebhooks] = useState<PurchaseWebhook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [adultPurchaseLink, setAdultPurchaseLink] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate('/entrar');
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      // Load saved adult purchase link
      const savedLink = localStorage.getItem('adult_purchase_link');
      if (savedLink) setAdultPurchaseLink(savedLink);
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles((profilesData || []) as Profile[]);

      // Fetch adult webhooks
      const { data: webhooksData, error: webhooksError } = await supabase
        .from('purchase_webhooks')
        .select('*')
        .eq('webhook_type', 'adult')
        .order('created_at', { ascending: false });

      if (webhooksError) throw webhooksError;
      setAdultWebhooks((webhooksData || []) as PurchaseWebhook[]);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setIsLoadingData(false);
    }
  };

  const toggleAdultAccess = async (profile: Profile) => {
    try {
      const newAccess = !profile.has_adult_access;
      const { error } = await supabase
        .from('profiles')
        .update({
          has_adult_access: newAccess,
          adult_access_start_date: newAccess ? new Date().toISOString() : null,
          adult_access_end_date: null,
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      setProfiles(prev =>
        prev.map(p =>
          p.user_id === profile.user_id
            ? { 
                ...p, 
                has_adult_access: newAccess,
                adult_access_start_date: newAccess ? new Date().toISOString() : null,
                adult_access_end_date: null
              }
            : p
        )
      );

      toast({
        title: newAccess ? 'Acesso +18 Liberado' : 'Acesso +18 Removido',
        description: `Acesso atualizado para ${profile.email}`,
      });
    } catch (err) {
      console.error('Error toggling adult access:', err);
      toast({ title: 'Erro', description: 'Erro ao atualizar acesso', variant: 'destructive' });
    }
  };

  const saveAdultPurchaseLink = () => {
    localStorage.setItem('adult_purchase_link', adultPurchaseLink);
    setShowLinkDialog(false);
    toast({ title: 'Link Salvo', description: 'Link de compra +18 salvo com sucesso' });
  };

  const copyWebhookUrl = () => {
    const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-adult`;
    navigator.clipboard.writeText(baseUrl);
    toast({ title: 'Copiado!', description: 'URL do webhook +18 copiada' });
  };

  const filteredProfiles = profiles.filter(p =>
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usersWithAdultAccess = profiles.filter(p => p.has_adult_access).length;
  const pendingWebhooks = adultWebhooks.filter(w => !w.processed).length;

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
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-category-adult" />
                <h1 className="text-xl font-bold">Gestão de Conteúdo +18</h1>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowLinkDialog(true)}>
              Configurar Link de Compra
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Webhook URL */}
        <Card className="mb-8 border-category-adult/30 bg-gradient-to-r from-category-adult/5 to-pink-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-category-adult" />
              Webhook +18
            </CardTitle>
            <CardDescription>
              Use este webhook no seu produto de conteúdo +18
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-muted p-3 rounded flex-1 truncate">
                {import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-adult
              </code>
              <Button onClick={copyWebhookUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
            {adultPurchaseLink && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Link de compra configurado:</p>
                <a href={adultPurchaseLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                  {adultPurchaseLink}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-category-adult/20 flex items-center justify-center mx-auto mb-2">
                  <Flame className="h-6 w-6 text-category-adult" />
                </div>
                <p className="text-3xl font-bold text-category-adult">{usersWithAdultAccess}</p>
                <p className="text-sm text-muted-foreground">Com Acesso +18</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-green-500">
                  {adultWebhooks.filter(w => w.processed).length}
                </p>
                <p className="text-sm text-muted-foreground">Compras Processadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-yellow-500">{pendingWebhooks}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <p className="text-3xl font-bold">{profiles.length}</p>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Adult Webhooks */}
        {adultWebhooks.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Últimas Compras +18</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {adultWebhooks.slice(0, 5).map((webhook) => (
                  <div key={webhook.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${webhook.processed ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                        {webhook.processed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{webhook.buyer_name || webhook.buyer_email}</p>
                        <p className="text-xs text-muted-foreground">{webhook.buyer_email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {webhook.amount && (
                        <p className="font-semibold text-green-500 text-sm">
                          R$ {webhook.amount.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(webhook.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários por email ou nome..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gerenciar Acesso +18</CardTitle>
            <CardDescription>Libere ou remova o acesso ao conteúdo adulto</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : (
              <div className="space-y-3">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{profile.full_name || profile.email}</p>
                          {profile.is_vip && (
                            <Badge className="bg-primary/20 text-primary">VIP</Badge>
                          )}
                          {profile.subscription_status === 'active' && (
                            <Badge variant="outline" className="text-xs">
                              {profile.plan_type === 'annual' ? 'Anual' : 'Mensal'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                        {profile.has_adult_access && profile.adult_access_start_date && (
                          <p className="text-xs text-category-adult mt-1">
                            Acesso +18 desde {new Date(profile.adult_access_start_date).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {profile.has_adult_access ? (
                        <Badge className="bg-category-adult/20 text-category-adult">
                          <Flame className="h-3 w-3 mr-1" />
                          +18 Liberado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircle className="h-3 w-3 mr-1" />
                          Sem Acesso
                        </Badge>
                      )}
                      <Switch
                        checked={profile.has_adult_access}
                        onCheckedChange={() => toggleAdultAccess(profile)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configure Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de Compra +18</DialogTitle>
            <DialogDescription>
              Configure o link que será exibido quando usuários tentarem acessar conteúdo +18 sem permissão
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>URL de Compra</Label>
              <Input
                placeholder="https://seusite.com/checkout/conteudo-adulto"
                value={adultPurchaseLink}
                onChange={(e) => setAdultPurchaseLink(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveAdultPurchaseLink} className="bg-category-adult hover:bg-category-adult/90">
              <Flame className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

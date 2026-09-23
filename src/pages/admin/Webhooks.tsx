import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, CheckCircle, Clock, AlertCircle, Copy, Link2, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseWebhook } from '@/lib/types';

export default function AdminWebhooks() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<PurchaseWebhook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(true);
  const [selectedWebhook, setSelectedWebhook] = useState<PurchaseWebhook | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate('/entrar');
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchWebhooks();
  }, [isAdmin]);

  const fetchWebhooks = async () => {
    setIsLoadingWebhooks(true);
    try {
      const { data, error } = await supabase
        .from('purchase_webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks((data || []) as PurchaseWebhook[]);
    } catch (err) {
      console.error('Error fetching webhooks:', err);
      toast({ title: 'Erro', description: 'Erro ao carregar webhooks', variant: 'destructive' });
    } finally {
      setIsLoadingWebhooks(false);
    }
  };

  const copyWebhookUrl = (type: string) => {
    const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-${type}`;
    navigator.clipboard.writeText(baseUrl);
    toast({ title: 'Copiado!', description: `URL do webhook ${type} copiada` });
  };

  const copyUnifiedWebhookUrl = () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-unificado`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copiado!', description: 'URL única do GGCheckout copiada' });
  };

  const getWebhookTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly': return 'Mensal';
      case 'annual': return 'Anual';
      case 'adult': return '+18';
      case 'single_content': return 'Conteúdo Único';
      default: return type;
    }
  };

  const getWebhookTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'annual': return 'default';
      case 'monthly': return 'secondary';
      case 'adult': return 'destructive';
      case 'single_content': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredWebhooks = webhooks.filter(w => {
    const matchesSearch = 
      w.buyer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && w.webhook_type === activeTab;
  });

  const getStatsByType = (type: string) => webhooks.filter(w => w.webhook_type === type).length;

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
              <h1 className="text-xl font-bold">Webhooks de Compra</h1>
            </div>
            <Link to="/admin/webhooks/gerar">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Gerar Webhook
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Webhook URLs */}
        <div className="mb-8">
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">Webhook único do GGCheckout</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted p-2 rounded flex-1 truncate">
                  .../webhook-unificado
                </code>
                <Button size="sm" variant="outline" onClick={copyUnifiedWebhookUrl} aria-label="Copiar webhook único">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Use este endereço para todos os produtos cadastrados.</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{webhooks.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">
                  {webhooks.filter(w => w.processed).length}
                </p>
                <p className="text-sm text-muted-foreground">Processados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-500">
                  {webhooks.filter(w => !w.processed).length}
                </p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  R$ {webhooks.reduce((acc, w) => acc + (w.amount || 0), 0).toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-muted-foreground">Total Vendas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Search */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
              <TabsTrigger value="annual">Anual</TabsTrigger>
              <TabsTrigger value="adult" className="text-category-adult">+18</TabsTrigger>
              <TabsTrigger value="single_content">Único</TabsTrigger>
            </TabsList>
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, nome ou transação..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {/* Webhooks List */}
            {isLoadingWebhooks ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredWebhooks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum webhook encontrado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Configure os URLs acima na sua plataforma de pagamento
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredWebhooks.map((webhook) => (
                  <Card 
                    key={webhook.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors" 
                    onClick={() => setSelectedWebhook(webhook)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${webhook.processed ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                            {webhook.processed ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{webhook.buyer_name || 'Sem nome'}</p>
                              <Badge variant={getWebhookTypeBadgeVariant(webhook.webhook_type) as any}>
                                {getWebhookTypeLabel(webhook.webhook_type)}
                              </Badge>
                              {webhook.product_name && webhook.webhook_type === 'single_content' && (
                                <Badge variant="outline" className="text-xs">
                                  {webhook.product_name}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{webhook.buyer_email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {webhook.amount && (
                            <p className="font-semibold text-green-500">
                              R$ {webhook.amount.toFixed(2).replace('.', ',')}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(webhook.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedWebhook} onOpenChange={() => setSelectedWebhook(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Webhook
              {selectedWebhook && (
                <Badge variant={getWebhookTypeBadgeVariant(selectedWebhook.webhook_type) as any}>
                  {getWebhookTypeLabel(selectedWebhook.webhook_type)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedWebhook && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedWebhook.buyer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedWebhook.buyer_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedWebhook.buyer_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documento</p>
                  <p className="font-medium">{selectedWebhook.buyer_document || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium text-green-500">
                    R$ {selectedWebhook.amount?.toFixed(2).replace('.', ',') || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status do Pagamento</p>
                  <p className="font-medium">{selectedWebhook.payment_status || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID da Transação</p>
                  <p className="font-medium text-xs">{selectedWebhook.transaction_id || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                  <p className="font-medium">{selectedWebhook.payment_method || '-'}</p>
                </div>
                {selectedWebhook.product_name && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Produto</p>
                    <p className="font-medium">{selectedWebhook.product_name}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Dados Raw (JSON)</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(selectedWebhook.raw_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

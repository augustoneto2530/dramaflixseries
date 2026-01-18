import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, Crown, UserCheck, UserX, MoreHorizontal, Mail, Calendar, KeyRound, Loader2, Flame, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/lib/types';

type MemberFilter = 'all' | 'monthly' | 'annual' | 'adult' | 'partial' | 'vip';

export default function AdminMembers() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [members, setMembers] = useState<Profile[]>([]);
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPlanType, setNewMemberPlanType] = useState<'monthly' | 'annual' | 'adult' | 'single_content'>('monthly');
  const [newMemberIncludeAdult, setNewMemberIncludeAdult] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [contents, setContents] = useState<{id: string, title: string}[]>([]);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate('/entrar');
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchMembers();
      fetchContents();
    }
  }, [isAdmin]);

  const fetchContents = async () => {
    setIsLoadingContents(true);
    try {
      const { data, error } = await supabase
        .from('contents')
        .select('id, title')
        .order('title');
      
      if (error) throw error;
      setContents(data || []);
    } catch (err) {
      console.error('Error fetching contents:', err);
    } finally {
      setIsLoadingContents(false);
    }
  };

  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      toast({ title: 'Erro', description: 'Erro ao carregar membros', variant: 'destructive' });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const toggleVIP = async (memberId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_vip: !currentStatus })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, is_vip: !currentStatus } : m
      ));

      toast({
        title: 'Sucesso',
        description: !currentStatus ? 'VIP ativado!' : 'VIP removido',
      });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao atualizar VIP', variant: 'destructive' });
    }
  };

  const activateSubscription = async (memberId: string, planType: 'monthly' | 'annual') => {
    try {
      const endDate = new Date();
      if (planType === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          plan_type: planType,
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: endDate.toISOString(),
        })
        .eq('id', memberId);

      if (error) throw error;

      fetchMembers();
      toast({ title: 'Sucesso', description: 'Assinatura ativada!' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao ativar assinatura', variant: 'destructive' });
    }
  };

  const deactivateSubscription = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'inactive',
          plan_type: null,
          subscription_end_date: null,
        })
        .eq('id', memberId);

      if (error) throw error;

      fetchMembers();
      toast({ title: 'Sucesso', description: 'Assinatura cancelada' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao cancelar', variant: 'destructive' });
    }
  };

  const toggleAdultAccess = async (memberId: string, currentStatus: boolean) => {
    try {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const { error } = await supabase
        .from('profiles')
        .update({
          has_adult_access: !currentStatus,
          adult_access_start_date: !currentStatus ? new Date().toISOString() : null,
          adult_access_end_date: !currentStatus ? endDate.toISOString() : null,
        })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, has_adult_access: !currentStatus } : m
      ));

      toast({
        title: 'Sucesso',
        description: !currentStatus ? 'Acesso +18 liberado!' : 'Acesso +18 removido',
      });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao atualizar acesso +18', variant: 'destructive' });
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: 'Email enviado!',
        description: `Link de recuperação enviado para ${email}`,
      });
    } catch (err) {
      console.error('Error sending password reset:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar email de recuperação',
        variant: 'destructive',
      });
    }
  };

  const addMember = async () => {
    if (!newMemberEmail) {
      toast({ title: 'Erro', description: 'Email é obrigatório', variant: 'destructive' });
      return;
    }

    if (newMemberPlanType === 'single_content' && !selectedContentId) {
      toast({ title: 'Erro', description: 'Selecione um conteúdo para o plano parcial', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-member', {
        body: { 
          email: newMemberEmail, 
          name: newMemberName,
          planType: newMemberPlanType,
          includeAdultAccess: newMemberIncludeAdult || newMemberPlanType === 'annual' || newMemberPlanType === 'adult',
          contentId: newMemberPlanType === 'single_content' ? selectedContentId : undefined,
        },
      });

      if (error) throw error;

      toast({ title: 'Sucesso', description: data?.message || 'Membro adicionado!' });
      setIsAddDialogOpen(false);
      setNewMemberEmail('');
      setNewMemberName('');
      setNewMemberPlanType('monthly');
      setNewMemberIncludeAdult(false);
      setSelectedContentId('');
      fetchMembers();
    } catch (err) {
      console.error('Error adding member:', err);
      toast({ title: 'Erro', description: 'Erro ao adicionar membro', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter by search
  const searchFiltered = members.filter(m =>
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter by type
  const filteredMembers = searchFiltered.filter(m => {
    switch (memberFilter) {
      case 'monthly':
        return m.subscription_status === 'active' && m.plan_type === 'monthly';
      case 'annual':
        return m.subscription_status === 'active' && m.plan_type === 'annual';
      case 'adult':
        return m.has_adult_access;
      case 'partial':
        return m.plan_type === 'single_content';
      case 'vip':
        return m.is_vip;
      default:
        return true;
    }
  });

  const memberCounts = {
    all: members.length,
    monthly: members.filter(m => m.subscription_status === 'active' && m.plan_type === 'monthly').length,
    annual: members.filter(m => m.subscription_status === 'active' && m.plan_type === 'annual').length,
    adult: members.filter(m => m.has_adult_access).length,
    partial: members.filter(m => m.plan_type === 'single_content').length,
    vip: members.filter(m => m.is_vip).length,
  };

  if (isLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-bold">Gerenciar Membros</h1>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="brand-gradient">
              Adicionar Membro
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <Tabs value={memberFilter} onValueChange={(v) => setMemberFilter(v as MemberFilter)} className="mb-6">
          <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="gap-1">
              <Users className="h-4 w-4" />
              Todos ({memberCounts.all})
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1">
              <Calendar className="h-4 w-4" />
              Mensais ({memberCounts.monthly})
            </TabsTrigger>
            <TabsTrigger value="annual" className="gap-1">
              <UserCheck className="h-4 w-4" />
              Anuais ({memberCounts.annual})
            </TabsTrigger>
            <TabsTrigger value="adult" className="gap-1">
              <Flame className="h-4 w-4" />
              +18 ({memberCounts.adult})
            </TabsTrigger>
            <TabsTrigger value="partial" className="gap-1">
              Parciais ({memberCounts.partial})
            </TabsTrigger>
            <TabsTrigger value="vip" className="gap-1">
              <Crown className="h-4 w-4" />
              VIP ({memberCounts.vip})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Members List */}
        {isLoadingMembers ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <div className="grid gap-4">
            {filteredMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {(member.full_name || member.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.full_name || 'Sem nome'}</p>
                          {member.is_vip && (
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">
                              <Crown className="h-3 w-3 mr-1" />
                              VIP
                            </Badge>
                          )}
                          {member.subscription_status === 'active' && (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                              <UserCheck className="h-3 w-3 mr-1" />
                              {member.plan_type === 'annual' ? 'Anual' : member.plan_type === 'monthly' ? 'Mensal' : 'Parcial'}
                            </Badge>
                          )}
                          {member.has_adult_access && (
                            <Badge variant="secondary" className="bg-pink-500/20 text-pink-500">
                              <Flame className="h-3 w-3 mr-1" />
                              +18
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(member.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleVIP(member.id, member.is_vip)}>
                          <Crown className="h-4 w-4 mr-2" />
                          {member.is_vip ? 'Remover VIP' : 'Dar VIP'}
                        </DropdownMenuItem>
                        {member.subscription_status !== 'active' && (
                          <>
                            <DropdownMenuItem onClick={() => activateSubscription(member.id, 'monthly')}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Ativar Mensal
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => activateSubscription(member.id, 'annual')}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Ativar Anual
                            </DropdownMenuItem>
                          </>
                        )}
                        {member.subscription_status === 'active' && (
                          <DropdownMenuItem onClick={() => deactivateSubscription(member.id)} className="text-destructive">
                            <UserX className="h-4 w-4 mr-2" />
                            Cancelar Assinatura
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => toggleAdultAccess(member.id, member.has_adult_access)}>
                          <Flame className="h-4 w-4 mr-2" />
                          {member.has_adult_access ? 'Remover Acesso +18' : 'Liberar Acesso +18'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => sendPasswordReset(member.email)}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Enviar Recuperação de Senha
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Membro</DialogTitle>
            <DialogDescription>
              O membro receberá acesso e poderá criar sua própria senha no primeiro acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planType">Tipo de Plano *</Label>
              <Select 
                value={newMemberPlanType} 
                onValueChange={(value: 'monthly' | 'annual' | 'adult' | 'single_content') => setNewMemberPlanType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Plano Mensal
                    </div>
                  </SelectItem>
                  <SelectItem value="annual">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      Plano Anual (inclui +18)
                    </div>
                  </SelectItem>
                  <SelectItem value="adult">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-pink-500" />
                      Acesso +18
                    </div>
                  </SelectItem>
                  <SelectItem value="single_content">
                    <div className="flex items-center gap-2">
                      Conteúdo Avulso
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newMemberPlanType === 'monthly' && (
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="includeAdult"
                  checked={newMemberIncludeAdult}
                  onCheckedChange={(checked) => setNewMemberIncludeAdult(checked as boolean)}
                />
                <label
                  htmlFor="includeAdult"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <Flame className="h-4 w-4 text-pink-500" />
                  Incluir acesso +18
                </label>
              </div>
            )}

            {newMemberPlanType === 'single_content' && (
              <div className="space-y-2">
                <Label htmlFor="contentSelect">Conteúdo a Liberar *</Label>
                <Select 
                  value={selectedContentId} 
                  onValueChange={setSelectedContentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingContents ? "Carregando..." : "Selecione o conteúdo"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {contents.map((content) => (
                      <SelectItem key={content.id} value={content.id}>
                        {content.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(newMemberPlanType === 'annual' || newMemberPlanType === 'adult') && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400 flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  Acesso +18 incluído automaticamente
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addMember} disabled={isSubmitting} className="brand-gradient">
              {isSubmitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

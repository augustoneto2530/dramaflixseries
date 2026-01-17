import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, Crown, UserCheck, UserX, MoreHorizontal, Mail, Phone, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function AdminMembers() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [members, setMembers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate('/entrar');
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchMembers();
  }, [isAdmin]);

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

  const addMember = async () => {
    if (!newMemberEmail) {
      toast({ title: 'Erro', description: 'Email é obrigatório', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-member', {
        body: { email: newMemberEmail, name: newMemberName },
      });

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Membro adicionado!' });
      setIsAddDialogOpen(false);
      setNewMemberEmail('');
      setNewMemberName('');
      fetchMembers();
    } catch (err) {
      console.error('Error adding member:', err);
      toast({ title: 'Erro', description: 'Erro ao adicionar membro', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                              {member.plan_type === 'annual' ? 'Anual' : 'Mensal'}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Membro</DialogTitle>
            <DialogDescription>
              Crie uma conta para um novo membro. Uma senha temporária será gerada.
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

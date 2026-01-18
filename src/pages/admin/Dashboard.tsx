import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Film, Webhook, Activity, Crown, TrendingUp, Calendar, Link2, MousePointer } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalMembers: number;
  activeSubscribers: number;
  vipMembers: number;
  totalContents: number;
  onlineUsers: number;
}

interface OnlineUserInfo {
  id: string;
  email: string;
  full_name: string | null;
  last_seen: string;
}

export default function AdminDashboard() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeSubscribers: 0,
    vipMembers: 0,
    totalContents: 0,
    onlineUsers: 0,
  });
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserInfo[]>([]);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/entrar');
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchOnlineUsers();

      // Subscribe to realtime online users
      const channel = supabase
        .channel('online_users_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'online_users' },
          () => {
            fetchOnlineUsers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      const [profilesRes, contentsRes, onlineRes] = await Promise.all([
        supabase.from('profiles').select('id, subscription_status, is_vip'),
        supabase.from('contents').select('id'),
        supabase.from('online_users').select('id').eq('is_online', true),
      ]);

      const profiles = profilesRes.data || [];
      setStats({
        totalMembers: profiles.length,
        activeSubscribers: profiles.filter(p => p.subscription_status === 'active').length,
        vipMembers: profiles.filter(p => p.is_vip).length,
        totalContents: contentsRes.data?.length || 0,
        onlineUsers: onlineRes.data?.length || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const { data } = await supabase
        .from('online_users')
        .select(`
          id,
          last_seen,
          profiles!inner(email, full_name)
        `)
        .eq('is_online', true)
        .order('last_seen', { ascending: false })
        .limit(10);

      if (data) {
        setOnlineUsers(data.map((u: any) => ({
          id: u.id,
          email: u.profiles.email,
          full_name: u.profiles.full_name,
          last_seen: u.last_seen,
        })));
      }
    } catch (err) {
      console.error('Error fetching online users:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const menuItems = [
    { title: 'Membros', description: 'Gerenciar usuários e VIPs', icon: Users, href: '/admin/membros', color: 'bg-blue-500' },
    { title: 'Conteúdos', description: 'Gerenciar filmes e séries', icon: Film, href: '/admin/conteudos', color: 'bg-purple-500' },
    { title: 'Ranking de Cliques', description: 'Conteúdos mais populares', icon: MousePointer, href: '/admin/cliques', color: 'bg-cyan-500' },
    { title: 'Webhooks', description: 'Visualizar compras', icon: Webhook, href: '/admin/webhooks', color: 'bg-green-500' },
    { title: 'Gerador de Webhooks', description: 'Criar URLs para vendas avulsas', icon: Link2, href: '/admin/webhooks/gerar', color: 'bg-orange-500' },
  ];

  const statsCards = [
    { title: 'Total de Membros', value: stats.totalMembers, icon: Users, color: 'text-blue-500' },
    { title: 'Assinantes Ativos', value: stats.activeSubscribers, icon: TrendingUp, color: 'text-green-500' },
    { title: 'Membros VIP', value: stats.vipMembers, icon: Crown, color: 'text-yellow-500' },
    { title: 'Conteúdos', value: stats.totalContents, icon: Film, color: 'text-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg brand-gradient flex items-center justify-center">
                <span className="text-xl font-bold text-white">D</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Painel Administrativo</h1>
                <p className="text-sm text-muted-foreground">Drama_Flix</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline">Voltar ao Site</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {menuItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="hover:border-primary transition-all duration-200 cursor-pointer hover:shadow-lg">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Online Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="relative">
                <Activity className="h-5 w-5 text-green-500" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              Usuários Online em Tempo Real
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({stats.onlineUsers} online)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onlineUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum usuário online no momento
              </p>
            ) : (
              <div className="space-y-3">
                {onlineUsers.map((onlineUser) => (
                  <div
                    key={onlineUser.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      </div>
                      <div>
                        <p className="font-medium">{onlineUser.full_name || 'Usuário'}</p>
                        <p className="text-sm text-muted-foreground">{onlineUser.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(onlineUser.last_seen).toLocaleTimeString('pt-BR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

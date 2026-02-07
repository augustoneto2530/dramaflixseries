import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Activity, Play, Clock, ArrowLeft, Eye, Film, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface OnlineUser {
  user_id: string;
  last_seen: string;
  is_online: boolean;
  email: string;
  full_name: string | null;
}

interface WatchingNow {
  user_id: string;
  email: string;
  full_name: string | null;
  content_title: string;
  episode_number: number;
  progress_seconds: number;
  last_watched_at: string;
  completed: boolean;
}

interface WatchHistory {
  user_id: string;
  email: string;
  full_name: string | null;
  content_title: string;
  episode_number: number;
  progress_seconds: number;
  last_watched_at: string;
  completed: boolean;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  return `${diffDays}d atrás`;
}

export default function OnlineUsers() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [watchingNow, setWatchingNow] = useState<WatchingNow[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/entrar');
    }
  }, [user, isAdmin, isLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;

    try {
      // Fetch online users with profile info
      const { data: onlineData } = await supabase
        .from('online_users')
        .select('user_id, last_seen, is_online')
        .eq('is_online', true)
        .order('last_seen', { ascending: false });

      if (onlineData && onlineData.length > 0) {
        const userIds = onlineData.map(u => u.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);

        const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        
        setOnlineUsers(onlineData.map(u => ({
          ...u,
          email: profileMap.get(u.user_id)?.email || 'N/A',
          full_name: profileMap.get(u.user_id)?.full_name || null,
        })));
      } else {
        setOnlineUsers([]);
      }

      // Fetch users watching now (last 15 minutes, not completed)
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: watchingData } = await supabase
        .from('watch_progress')
        .select(`
          user_id,
          progress_seconds,
          completed,
          last_watched_at,
          episodes!inner(episode_number, content_id, contents!inner(title))
        `)
        .gte('last_watched_at', fifteenMinAgo)
        .eq('completed', false)
        .order('last_watched_at', { ascending: false });

      if (watchingData && watchingData.length > 0) {
        const watchUserIds = [...new Set(watchingData.map(w => w.user_id))];
        const { data: watchProfiles } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', watchUserIds);

        const watchProfileMap = new Map(watchProfiles?.map(p => [p.user_id, p]) || []);

        // Deduplicate - show only the latest entry per user
        const seenUsers = new Set<string>();
        const dedupedWatching: WatchingNow[] = [];
        
        for (const w of watchingData) {
          if (seenUsers.has(w.user_id)) continue;
          seenUsers.add(w.user_id);
          const ep = w.episodes as any;
          dedupedWatching.push({
            user_id: w.user_id,
            email: watchProfileMap.get(w.user_id)?.email || 'N/A',
            full_name: watchProfileMap.get(w.user_id)?.full_name || null,
            content_title: ep?.contents?.title || 'Desconhecido',
            episode_number: ep?.episode_number || 0,
            progress_seconds: w.progress_seconds,
            last_watched_at: w.last_watched_at,
            completed: w.completed,
          });
        }

        setWatchingNow(dedupedWatching);
      } else {
        setWatchingNow([]);
      }

      // Fetch recent watch history (last 24h, all users)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: historyData } = await supabase
        .from('watch_progress')
        .select(`
          user_id,
          progress_seconds,
          completed,
          last_watched_at,
          episodes!inner(episode_number, content_id, contents!inner(title))
        `)
        .gte('last_watched_at', oneDayAgo)
        .order('last_watched_at', { ascending: false })
        .limit(50);

      if (historyData && historyData.length > 0) {
        const histUserIds = [...new Set(historyData.map(h => h.user_id))];
        const { data: histProfiles } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', histUserIds);

        const histProfileMap = new Map(histProfiles?.map(p => [p.user_id, p]) || []);

        setWatchHistory(historyData.map(h => {
          const ep = h.episodes as any;
          return {
            user_id: h.user_id,
            email: histProfileMap.get(h.user_id)?.email || 'N/A',
            full_name: histProfileMap.get(h.user_id)?.full_name || null,
            content_title: ep?.contents?.title || 'Desconhecido',
            episode_number: ep?.episode_number || 0,
            progress_seconds: h.progress_seconds,
            last_watched_at: h.last_watched_at,
            completed: h.completed,
          };
        }));
      } else {
        setWatchHistory([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    // Subscribe to realtime changes
    const channel = supabase
      .channel('admin_online_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_users' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watch_progress' }, () => fetchData())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Usuários Online & Atividade
                </h1>
                <p className="text-sm text-muted-foreground">Monitore em tempo real</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Online Agora</p>
                  <p className="text-3xl font-bold">{onlineUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Play className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assistindo Agora</p>
                  <p className="text-3xl font-bold">{watchingNow.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Atividades (24h)</p>
                  <p className="text-3xl font-bold">{watchHistory.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Watching Now Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="relative">
                <Play className="h-5 w-5 text-red-500" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              Assistindo Agora
              <Badge variant="secondary" className="ml-2">{watchingNow.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {watchingNow.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Ninguém assistindo no momento
              </p>
            ) : (
              <div className="space-y-3">
                {watchingNow.map((item, idx) => (
                  <div
                    key={`${item.user_id}-${idx}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                          <Play className="h-5 w-5 text-red-500 fill-red-500" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                      </div>
                      <div>
                        <p className="font-medium">{item.full_name || 'Usuário'}</p>
                        <p className="text-sm text-muted-foreground">{item.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Film className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{item.content_title}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Ep. {item.episode_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(item.progress_seconds)} assistidos
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(item.last_watched_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Online Users Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="relative">
                <Activity className="h-5 w-5 text-green-500" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              Usuários Online
              <Badge variant="secondary" className="ml-2">{onlineUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onlineUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum usuário online no momento
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {onlineUsers.map((onlineUser) => (
                  <div
                    key={onlineUser.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-green-500" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{onlineUser.full_name || 'Usuário'}</p>
                        <p className="text-xs text-muted-foreground">{onlineUser.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(onlineUser.last_seen)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Watch History Section (Last 24h) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              Histórico de Visualizações (últimas 24h)
              <Badge variant="secondary" className="ml-2">{watchHistory.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {watchHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma visualização nas últimas 24 horas
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Usuário</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Conteúdo</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Ep.</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Progresso</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchHistory.map((item, idx) => (
                      <tr key={`${item.user_id}-${idx}`} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-2">
                          <p className="font-medium text-sm">{item.full_name || 'Usuário'}</p>
                          <p className="text-xs text-muted-foreground">{item.email}</p>
                        </td>
                        <td className="py-3 px-2">
                          <p className="text-sm font-medium">{item.content_title}</p>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-sm">{item.episode_number}</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-sm">{formatDuration(item.progress_seconds)}</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {item.completed ? (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                              Completo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Assistindo
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(item.last_watched_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

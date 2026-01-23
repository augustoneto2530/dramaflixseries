import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Play, 
  Users, 
  Clock, 
  TrendingUp,
  Eye,
  CheckCircle,
  Film
} from 'lucide-react';

interface EpisodeStats {
  episode_id: string;
  episode_title: string | null;
  episode_number: number;
  content_id: string;
  content_title: string;
  cover_image_url: string | null;
  category: string;
  total_views: number;
  completed_views: number;
  total_watch_time: number;
}

interface UserStats {
  user_id: string;
  email: string;
  full_name: string | null;
  episodes_watched: number;
  completed_episodes: number;
  total_watch_time: number;
  last_watched_at: string;
}

interface OverviewStats {
  totalWatchTime: number;
  totalViews: number;
  completedViews: number;
  activeViewers: number;
  avgWatchTime: number;
}

export default function WatchStats() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [episodeStats, setEpisodeStats] = useState<EpisodeStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [overview, setOverview] = useState<OverviewStats>({
    totalWatchTime: 0,
    totalViews: 0,
    completedViews: 0,
    activeViewers: 0,
    avgWatchTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/login');
    }
  }, [isLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin, timeFilter]);

  const getDateFilter = () => {
    const now = new Date();
    if (timeFilter === '7d') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (timeFilter === '30d') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    return null;
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();

      // Fetch watch progress with episode and content info
      let query = supabase
        .from('watch_progress')
        .select(`
          *,
          episodes!inner(
            id,
            episode_number,
            title,
            content_id,
            contents!inner(
              id,
              title,
              cover_image_url,
              category
            )
          )
        `);

      if (dateFilter) {
        query = query.gte('last_watched_at', dateFilter);
      }

      const { data: progressData, error } = await query;

      if (error) {
        console.error('Error fetching watch stats:', error);
        setLoading(false);
        return;
      }

      if (!progressData || progressData.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate episode stats
      const episodeMap = new Map<string, EpisodeStats>();
      progressData.forEach((wp: any) => {
        const epId = wp.episode_id;
        const existing = episodeMap.get(epId);
        
        if (existing) {
          existing.total_views++;
          existing.total_watch_time += wp.progress_seconds;
          if (wp.completed) existing.completed_views++;
        } else {
          episodeMap.set(epId, {
            episode_id: epId,
            episode_title: wp.episodes.title,
            episode_number: wp.episodes.episode_number,
            content_id: wp.episodes.content_id,
            content_title: wp.episodes.contents.title,
            cover_image_url: wp.episodes.contents.cover_image_url,
            category: wp.episodes.contents.category,
            total_views: 1,
            completed_views: wp.completed ? 1 : 0,
            total_watch_time: wp.progress_seconds
          });
        }
      });

      const episodeStatsArray = Array.from(episodeMap.values())
        .sort((a, b) => b.total_views - a.total_views);
      setEpisodeStats(episodeStatsArray);

      // Fetch user info for user stats
      const userIds = [...new Set(progressData.map((wp: any) => wp.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Calculate user stats
      const userMap = new Map<string, UserStats>();
      progressData.forEach((wp: any) => {
        const userId = wp.user_id;
        const profile = profileMap.get(userId);
        const existing = userMap.get(userId);
        
        if (existing) {
          existing.episodes_watched++;
          existing.total_watch_time += wp.progress_seconds;
          if (wp.completed) existing.completed_episodes++;
          if (wp.last_watched_at > existing.last_watched_at) {
            existing.last_watched_at = wp.last_watched_at;
          }
        } else {
          userMap.set(userId, {
            user_id: userId,
            email: profile?.email || 'Desconhecido',
            full_name: profile?.full_name || null,
            episodes_watched: 1,
            completed_episodes: wp.completed ? 1 : 0,
            total_watch_time: wp.progress_seconds,
            last_watched_at: wp.last_watched_at
          });
        }
      });

      const userStatsArray = Array.from(userMap.values())
        .sort((a, b) => b.total_watch_time - a.total_watch_time);
      setUserStats(userStatsArray);

      // Calculate overview
      const totalWatchTime = progressData.reduce((sum: number, wp: any) => sum + wp.progress_seconds, 0);
      const totalViews = progressData.length;
      const completedViews = progressData.filter((wp: any) => wp.completed).length;
      const activeViewers = userMap.size;

      setOverview({
        totalWatchTime,
        totalViews,
        completedViews,
        activeViewers,
        avgWatchTime: totalViews > 0 ? totalWatchTime / totalViews : 0
      });

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'doramas': return 'bg-pink-500/20 text-pink-400';
      case 'series': return 'bg-blue-500/20 text-blue-400';
      case 'filmes': return 'bg-purple-500/20 text-purple-400';
      case 'novelas': return 'bg-amber-500/20 text-amber-400';
      case 'adult': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Estatísticas de Visualização</h1>
                <p className="text-sm text-muted-foreground">Acompanhe o que os usuários estão assistindo</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">Ver Site</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Time Filter */}
        <div className="mb-6">
          <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="7d">Últimos 7 dias</TabsTrigger>
              <TabsTrigger value="30d">Últimos 30 dias</TabsTrigger>
              <TabsTrigger value="all">Todo período</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatDuration(overview.totalWatchTime)}</p>
                  <p className="text-xs text-muted-foreground">Tempo Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overview.totalViews}</p>
                  <p className="text-xs text-muted-foreground">Visualizações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overview.completedViews}</p>
                  <p className="text-xs text-muted-foreground">Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overview.activeViewers}</p>
                  <p className="text-xs text-muted-foreground">Usuários Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatDuration(overview.avgWatchTime)}</p>
                  <p className="text-xs text-muted-foreground">Média/Episódio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : overview.totalViews === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <Film className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma visualização registrada</h3>
              <p className="text-muted-foreground">
                Quando os usuários começarem a assistir, as estatísticas aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Top Episodes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  Episódios Mais Assistidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {episodeStats.slice(0, 15).map((stat, index) => (
                    <div 
                      key={stat.episode_id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className={`
                        w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm
                        ${index === 0 ? 'bg-yellow-500 text-yellow-950' : 
                          index === 1 ? 'bg-gray-300 text-gray-800' : 
                          index === 2 ? 'bg-amber-600 text-amber-950' : 
                          'bg-muted-foreground/20 text-muted-foreground'}
                      `}>
                        {index + 1}
                      </span>
                      
                      <img 
                        src={stat.cover_image_url || '/placeholder.svg'} 
                        alt={stat.content_title}
                        className="w-12 h-16 object-cover rounded"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{stat.content_title}</p>
                        <p className="text-sm text-muted-foreground">
                          Ep. {stat.episode_number}
                          {stat.episode_title && `: ${stat.episode_title}`}
                        </p>
                        <Badge className={`text-xs mt-1 ${getCategoryColor(stat.category)}`}>
                          {stat.category}
                        </Badge>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold">{stat.total_views}</p>
                        <p className="text-xs text-muted-foreground">views</p>
                        <p className="text-xs text-green-400">{stat.completed_views} concluídos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Usuários Mais Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {userStats.slice(0, 15).map((stat, index) => (
                    <div 
                      key={stat.user_id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className={`
                        w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm
                        ${index === 0 ? 'bg-yellow-500 text-yellow-950' : 
                          index === 1 ? 'bg-gray-300 text-gray-800' : 
                          index === 2 ? 'bg-amber-600 text-amber-950' : 
                          'bg-muted-foreground/20 text-muted-foreground'}
                      `}>
                        {index + 1}
                      </span>
                      
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="font-bold text-primary">
                          {(stat.full_name || stat.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{stat.full_name || 'Sem nome'}</p>
                        <p className="text-sm text-muted-foreground truncate">{stat.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Último acesso: {formatDate(stat.last_watched_at)}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold">{formatDuration(stat.total_watch_time)}</p>
                        <p className="text-xs text-muted-foreground">
                          {stat.episodes_watched} episódios
                        </p>
                        <p className="text-xs text-green-400">
                          {stat.completed_episodes} concluídos
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
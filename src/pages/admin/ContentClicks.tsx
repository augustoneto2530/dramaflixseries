import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, TrendingUp, Trophy, MousePointer } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ContentClickStats {
  content_id: string;
  title: string;
  cover_image_url: string | null;
  category: string;
  is_adult: boolean;
  total_clicks: number;
  clicks_today: number;
  clicks_week: number;
  clicks_month: number;
  last_clicked_at: string | null;
}

type TimeFilter = '24h' | '7d' | '30d' | 'total';

export default function ContentClicks() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ContentClickStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [totalClicks, setTotalClicks] = useState(0);
  const [clicksToday, setClicksToday] = useState(0);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/entrar');
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchClickStats();
    }
  }, [isAdmin]);

  const fetchClickStats = async () => {
    setIsLoadingStats(true);
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get all contents
      const { data: contents } = await supabase
        .from('contents')
        .select('id, title, cover_image_url, category, is_adult');

      if (!contents) return;

      // Get all clicks
      const { data: allClicks } = await supabase
        .from('content_clicks')
        .select('content_id, clicked_at');

      const clicks = allClicks || [];

      // Calculate stats for each content
      const statsMap: Record<string, ContentClickStats> = {};

      contents.forEach(content => {
        statsMap[content.id] = {
          content_id: content.id,
          title: content.title,
          cover_image_url: content.cover_image_url,
          category: content.category,
          is_adult: content.is_adult,
          total_clicks: 0,
          clicks_today: 0,
          clicks_week: 0,
          clicks_month: 0,
          last_clicked_at: null,
        };
      });

      let totalClicksCount = 0;
      let todayClicksCount = 0;

      clicks.forEach(click => {
        if (statsMap[click.content_id]) {
          const clickDate = new Date(click.clicked_at);
          statsMap[click.content_id].total_clicks++;
          totalClicksCount++;

          if (click.clicked_at >= todayStart) {
            statsMap[click.content_id].clicks_today++;
            todayClicksCount++;
          }
          if (click.clicked_at >= weekAgo) {
            statsMap[click.content_id].clicks_week++;
          }
          if (click.clicked_at >= monthAgo) {
            statsMap[click.content_id].clicks_month++;
          }

          if (!statsMap[click.content_id].last_clicked_at || 
              click.clicked_at > statsMap[click.content_id].last_clicked_at!) {
            statsMap[click.content_id].last_clicked_at = click.clicked_at;
          }
        }
      });

      setTotalClicks(totalClicksCount);
      setClicksToday(todayClicksCount);

      // Convert to array and sort
      const statsArray = Object.values(statsMap).sort((a, b) => b.total_clicks - a.total_clicks);
      setStats(statsArray);
    } catch (err) {
      console.error('Error fetching click stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const getClickCount = (stat: ContentClickStats): number => {
    switch (timeFilter) {
      case '24h': return stat.clicks_today;
      case '7d': return stat.clicks_week;
      case '30d': return stat.clicks_month;
      case 'total': return stat.total_clicks;
    }
  };

  const sortedStats = [...stats].sort((a, b) => getClickCount(b) - getClickCount(a));
  const topContent = sortedStats[0];
  const activeContents = sortedStats.filter(s => getClickCount(s) > 0).length;

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-700" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs text-muted-foreground">{index + 1}</span>;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'adult': return 'bg-pink-500/20 text-pink-400';
      case 'doramas': return 'bg-blue-500/20 text-blue-400';
      case 'novelas': return 'bg-purple-500/20 text-purple-400';
      case 'filmes': return 'bg-green-500/20 text-green-400';
      case 'series': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (isLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500 flex items-center justify-center">
                <MousePointer className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Ranking de Cliques</h1>
                <p className="text-sm text-muted-foreground">Acompanhe os conteúdos mais populares</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-cyan-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Eye className="h-4 w-4" />
                Cliques Hoje
              </div>
              <p className="text-3xl font-bold text-cyan-400">{clicksToday}</p>
            </CardContent>
          </Card>

          <Card className="border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="h-4 w-4" />
                Total de Cliques
              </div>
              <p className="text-3xl font-bold text-green-400">{totalClicks}</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Trophy className="h-4 w-4" />
                Top 1
              </div>
              <p className="text-lg font-bold text-yellow-400 truncate">
                {topContent?.title || '-'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <MousePointer className="h-4 w-4" />
                Conteúdos Clicados
              </div>
              <p className="text-3xl font-bold text-purple-400">{activeContents}</p>
            </CardContent>
          </Card>
        </div>

        {/* Time Filter */}
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)} className="mb-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="24h">24 horas</TabsTrigger>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
            <TabsTrigger value="total">Total</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content List */}
        {isLoadingStats ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {sortedStats.map((stat, index) => (
              <Card 
                key={stat.content_id} 
                className={`transition-all ${
                  index === 0 ? 'border-yellow-500/50 bg-yellow-500/5' :
                  index === 1 ? 'border-gray-400/30' :
                  index === 2 ? 'border-amber-700/30' : ''
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8">
                        {getRankBadge(index)}
                      </div>
                      <div className="w-14 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {stat.cover_image_url ? (
                          <img 
                            src={stat.cover_image_url} 
                            alt={stat.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Eye className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{stat.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getCategoryColor(stat.category)}>
                            {stat.is_adult ? '+18' : stat.category}
                          </Badge>
                          {stat.last_clicked_at && (
                            <span className="text-xs text-muted-foreground">
                              ⏱ {new Date(stat.last_clicked_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-cyan-400">{getClickCount(stat)}</p>
                      <p className="text-xs text-muted-foreground">cliques</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
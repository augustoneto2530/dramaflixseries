import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Content } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContentAccess } from "@/hooks/useContentAccess";
import { ContentAccessPopup } from "@/components/content/ContentAccessPopup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, Star, Calendar, Clock, Film, ChevronLeft, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { CHECKOUT_LINKS } from "@/lib/checkoutLinks";
import { isPlayableVideoUrl } from "@/lib/media";

interface Episode {
  id: string;
  content_id: string;
  episode_number: number;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
}

const categoryLabels: Record<string, string> = {
  doramas: "Dorama",
  adult: "+18",
  novelas: "Novela",
  filmes: "Filme",
  series: "Série",
};

export default function ContentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkContentAccess, getBlockedReason, loading: accessLoading } = useContentAccess();

  const [content, setContent] = useState<Content | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [showAccessPopup, setShowAccessPopup] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      if (!id) return;

      try {
        setLoading(true);

        const contentRequest = supabase.from("contents").select("*").eq("id", id).single();
        const episodesRequest = supabase
          .from("episodes")
          .select("*")
          .eq("content_id", id)
          .order("episode_number", { ascending: true });
        const watchlistRequest = user
          ? supabase.from("user_watchlist").select("id").eq("user_id", user.id).eq("content_id", id).maybeSingle()
          : Promise.resolve({ data: null, error: null });

        const [contentResult, episodesResult, watchlistResult] = await Promise.all([
          contentRequest,
          episodesRequest,
          watchlistRequest,
        ]);
        const { data: contentData, error: contentError } = contentResult;

        if (contentError) {
          console.error("Error fetching content:", contentError);
          return;
        }

        if (contentData) {
          setContent(contentData as Content);
        }

        const { data: episodesData, error: episodesError } = episodesResult;

        if (!episodesError && episodesData) {
          const playableEpisodes = episodesData.filter((episode) => isPlayableVideoUrl(episode.video_url));
          setEpisodes(playableEpisodes);
          if (playableEpisodes.length > 0) {
            setSelectedEpisode(playableEpisodes[0]);
          }
        }

        setIsInWatchlist(!!watchlistResult.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, user]);

  const handlePlayClick = () => {
    if (!content) return;

    // Wait for purchases to load before checking access (prevents false +18 popup
    // for users who bought the standalone adult content)
    if (accessLoading) {
      toast.info("Verificando acesso...");
      return;
    }

    const accessResult = checkContentAccess(content);
    if (!accessResult.hasAccess) {
      setShowAccessPopup(true);
      return;
    }

    // Navigate to watch page with selected episode
    if (selectedEpisode) {
      navigate(`/assistir/${id}?ep=${selectedEpisode.id}`);
    } else {
      navigate(`/assistir/${id}`);
    }
  };

  const handleEpisodeClick = (episode: Episode) => {
    setSelectedEpisode(episode);

    if (accessLoading || !content) return;

    // If user has access, navigate to watch immediately
    const accessResult = checkContentAccess(content);
    if (accessResult.hasAccess) {
      navigate(`/assistir/${id}?ep=${episode.id}`);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!user) {
      toast.error("Faça login para adicionar à sua lista");
      return;
    }

    if (!content) return;

    try {
      if (isInWatchlist) {
        await supabase.from("user_watchlist").delete().eq("user_id", user.id).eq("content_id", content.id);

        setIsInWatchlist(false);
        toast.success("Removido da sua lista");
      } else {
        await supabase.from("user_watchlist").insert({ user_id: user.id, content_id: content.id });

        setIsInWatchlist(true);
        toast.success("Adicionado à sua lista");
      }
    } catch (error) {
      console.error("Error updating watchlist:", error);
      toast.error("Erro ao atualizar lista");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!content) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Conteúdo não encontrado</h1>
            <Link to="/" className="text-primary hover:underline">
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Only compute blocked reason after purchases finished loading — otherwise
  // a user who bought a +18 standalone would briefly see the "buy +18" popup
  const blockedReason = accessLoading ? null : getBlockedReason(content);
  const hasAccess = !blockedReason;

  return (
    <Layout showFooter={false}>
      {/* Hero Banner */}
      <div className="relative min-h-[60vh] md:min-h-[70vh]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={content.banner_image_url || content.cover_image_url || "/placeholder.svg"}
            alt={content.title}
            className="w-full h-full object-cover"
          />
          <div className="hero-overlay absolute inset-0" />
          <div className="hero-overlay-bottom absolute inset-0" />
        </div>

        {/* Content Info */}
        <div className="relative z-10 container mx-auto px-4 pt-24 md:pt-32 pb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            Voltar
          </Link>

          <div className="max-w-3xl">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {content.is_new && <Badge className="bg-accent text-accent-foreground">Lançamento</Badge>}
              <Badge variant="outline" className={`category-${content.category}`}>
                {categoryLabels[content.category]}
              </Badge>
              {content.is_adult && <Badge variant="destructive">+18</Badge>}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold mb-4">{content.title}</h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
              {content.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-accent fill-accent" />
                  <span className="font-semibold text-foreground">{content.rating}</span>
                  <span>/10</span>
                </div>
              )}
              {content.release_year && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{content.release_year}</span>
                </div>
              )}
              {content.duration_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{content.duration_minutes} min</span>
                </div>
              )}
              {content.total_episodes && content.total_episodes > 1 && (
                <div className="flex items-center gap-1">
                  <Film className="h-4 w-4" />
                  <span>{content.total_episodes} episódios</span>
                </div>
              )}
            </div>

            {/* Description */}
            {content.description && (
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl">{content.description}</p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className={`${hasAccess ? "brand-gradient glow-primary" : ""} gap-2`}
                onClick={handlePlayClick}
              >
                {hasAccess ? (
                  <>
                    <Play className="h-5 w-5" />
                    Assistir Agora
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Desbloquear
                  </>
                )}
              </Button>

              <Button size="lg" variant="outline" className="gap-2" onClick={handleToggleWatchlist}>
                {isInWatchlist ? (
                  <>
                    <Check className="h-5 w-5" />
                    Na Minha Lista
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Minha Lista
                  </>
                )}
              </Button>
            </div>

            {/* Tags */}
            {content.tags && content.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8">
                {content.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Episodes Section */}
      {episodes.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6">Episódios</h2>

          <div className="grid gap-4">
            {episodes.map((episode) => (
              <div
                key={episode.id}
                className={`flex gap-4 p-4 rounded-lg bg-card border transition-all cursor-pointer hover:border-primary ${
                  selectedEpisode?.id === episode.id ? "border-primary" : "border-border"
                }`}
                onClick={() => handleEpisodeClick(episode)}
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-40 aspect-video rounded-md overflow-hidden bg-muted">
                  <img
                    src={episode.thumbnail_url || content.cover_image_url || "/placeholder.svg"}
                    alt={episode.title || `Episódio ${episode.episode_number}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      const fallback = content.cover_image_url || "/placeholder.svg";
                      if (img.src !== fallback) img.src = fallback;
                    }}
                  />
                  {hasAccess && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  )}
                  {!hasAccess && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
                        Episódio {episode.episode_number}
                        {episode.title && `: ${episode.title}`}
                      </h3>
                      {episode.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{episode.description}</p>
                      )}
                    </div>
                    {episode.duration_minutes && (
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        {episode.duration_minutes} min
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Access Popup */}
      <ContentAccessPopup
        open={showAccessPopup}
        onOpenChange={setShowAccessPopup}
        type={blockedReason || "premium"}
        adultPurchaseLink={CHECKOUT_LINKS.adultContentPage}
      />
    </Layout>
  );
}

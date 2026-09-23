import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Content } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useContentAccess } from '@/hooks/useContentAccess';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

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

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const episodeId = searchParams.get('ep');
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { checkContentAccess, loading: accessLoading } = useContentAccess();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedProgressRef = useRef<number>(0);
  const saveProgressIntervalRef = useRef<NodeJS.Timeout>();
  
  const [content, setContent] = useState<Content | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  // Save watch progress to database
  const saveWatchProgress = useCallback(async (seconds: number, completed: boolean = false) => {
    if (!user || !currentEpisode) return;
    
    // Só grava se avançou pelo menos 25 segundos (ou terminou) — reduz carga no banco
    if (!completed && Math.abs(seconds - lastSavedProgressRef.current) < 25) return;
    
    try {
      const { error } = await supabase
        .from('watch_progress')
        .upsert({
          user_id: user.id,
          episode_id: currentEpisode.id,
          progress_seconds: Math.floor(seconds),
          completed,
          last_watched_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,episode_id'
        });

      if (error) {
        console.error('Error saving watch progress:', error);
      } else {
        lastSavedProgressRef.current = seconds;
        console.log('Watch progress saved:', Math.floor(seconds), 'seconds');
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }, [user, currentEpisode]);

  // Load saved progress when episode changes
  const loadSavedProgress = useCallback(async () => {
    if (!user || !currentEpisode) return;

    try {
      const { data, error } = await supabase
        .from('watch_progress')
        .select('progress_seconds, completed')
        .eq('user_id', user.id)
        .eq('episode_id', currentEpisode.id)
        .maybeSingle();

      if (!error && data && !data.completed && data.progress_seconds > 10) {
        // Resume from saved position (minus 5 seconds for context)
        const resumeTime = Math.max(0, data.progress_seconds - 5);
        if (videoRef.current) {
          videoRef.current.currentTime = resumeTime;
          toast.info(`Continuando de onde você parou (${formatTime(resumeTime)})`);
        }
      }
    } catch (err) {
      // No saved progress - that's fine
    }
  }, [user, currentEpisode]);

  // Set up interval to save progress every 15 seconds while playing
  useEffect(() => {
    if (isPlaying && user && currentEpisode) {
      saveProgressIntervalRef.current = setInterval(() => {
        if (videoRef.current) {
          saveWatchProgress(videoRef.current.currentTime);
        }
      }, 60000);
    }

    return () => {
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
      }
    };
  }, [isPlaying, user, currentEpisode, saveWatchProgress]);

  // Save progress when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (videoRef.current && user && currentEpisode) {
        // Use sendBeacon for reliable saving on page unload
        const data = JSON.stringify({
          user_id: user.id,
          episode_id: currentEpisode.id,
          progress_seconds: Math.floor(videoRef.current.currentTime),
          completed: false,
          last_watched_at: new Date().toISOString()
        });
        navigator.sendBeacon && navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/watch_progress?on_conflict=user_id,episode_id`,
          data
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentEpisode]);

  // Load saved progress when episode is loaded
  useEffect(() => {
    if (currentEpisode && user) {
      loadSavedProgress();
    }
  }, [currentEpisode, user, loadSavedProgress]);

  useEffect(() => {
    const fetchContent = async () => {
      if (!id) return;
      
      // Wait for auth, profile and purchases to finish loading before checking access.
      // Without this, profile is still null and access check incorrectly fails for
      // users that just signed in or that have a combo subscription (annual + adult).
      if (authLoading || accessLoading) return;
      if (user && !profile) return;

      try {
        setLoading(true);
        
        // Content metadata and episodes are independent, so load both together.
        const [contentResult, episodesResult] = await Promise.all([
          supabase.from('contents').select('*').eq('id', id).single(),
          supabase.from('episodes').select('*').eq('content_id', id).order('episode_number', { ascending: true }),
        ]);

        const { data: contentData, error: contentError } = contentResult;

        if (contentError) {
          console.error('Error fetching content:', contentError);
          toast.error('Erro ao carregar conteúdo');
          navigate('/');
          return;
        }

        if (contentData) {
          setContent(contentData as Content);
          
          // Check access - now profile and purchases are fully loaded
          const accessResult = checkContentAccess(contentData as Content);
          if (!accessResult.hasAccess) {
            toast.error('Você não tem acesso a este conteúdo');
            navigate(`/conteudo/${id}`);
            return;
          }
          setHasAccess(true);
        }

        const { data: episodesData, error: episodesError } = episodesResult;

        if (!episodesError && episodesData && episodesData.length > 0) {
          setEpisodes(episodesData);
          
          // Find current episode
          if (episodeId) {
            const episode = episodesData.find(ep => ep.id === episodeId);
            setCurrentEpisode(episode || episodesData[0]);
          } else {
            setCurrentEpisode(episodesData[0]);
          }
        } else if (!episodesError && (!episodesData || episodesData.length === 0)) {
          toast.error('Nenhum episódio disponível');
          navigate(`/conteudo/${id}`);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Erro ao carregar');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, episodeId, navigate, checkContentAccess, accessLoading, authLoading, user, profile]);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isPlaying]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      setCurrentTime(current);
      setProgress((current / dur) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoEnded = () => {
    // Mark as completed when video ends
    if (videoRef.current) {
      saveWatchProgress(videoRef.current.duration, true);
    }
    goToNextEpisode();
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    // Save progress when user pauses
    if (videoRef.current) {
      saveWatchProgress(videoRef.current.currentTime);
    }
  };

  const togglePlay = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        try {
          await videoRef.current.play();
        } catch (error) {
          console.error('Unable to start video playback:', error);
          toast.error('Não foi possível iniciar o vídeo. Toque novamente para tentar.');
        }
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (parseFloat(e.target.value) / 100) * duration;
      videoRef.current.currentTime = newTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const goToEpisode = (episode: Episode) => {
    setCurrentEpisode(episode);
    setShowEpisodes(false);
    navigate(`/assistir/${id}?ep=${episode.id}`, { replace: true });
  };

  const goToNextEpisode = () => {
    if (!currentEpisode) return;
    const currentIndex = episodes.findIndex(ep => ep.id === currentEpisode.id);
    if (currentIndex < episodes.length - 1) {
      goToEpisode(episodes[currentIndex + 1]);
    }
  };

  const goToPreviousEpisode = () => {
    if (!currentEpisode) return;
    const currentIndex = episodes.findIndex(ep => ep.id === currentEpisode.id);
    if (currentIndex > 0) {
      goToEpisode(episodes[currentIndex - 1]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!content || !currentEpisode || !hasAccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">Conteúdo não disponível</h1>
          <Button onClick={() => navigate('/')}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen bg-black flex items-center justify-center cursor-none"
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Video Player */}
      <video
        key={currentEpisode.id}
        ref={videoRef}
        src={currentEpisode.video_url}
        className="w-full h-full max-h-screen object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadStart={() => setIsBuffering(true)}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPause={handleVideoPause}
        onEnded={handleVideoEnded}
        onClick={togglePlay}
        onError={(e) => {
          const mediaError = e.currentTarget.error;
          console.error('Video error:', mediaError?.code, mediaError?.message);
          setIsBuffering(false);
          toast.error('Erro ao carregar vídeo. Verifique sua conexão e tente novamente.');
        }}
        playsInline
        muted={isMuted}
        preload="auto"
        autoPlay
      />

      {isBuffering && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" aria-live="polite">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      )}

      {/* Controls Overlay */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => navigate(`/conteudo/${id}`)}
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-white font-bold text-lg md:text-xl">
                  {content.title}
                </h1>
                <p className="text-white/70 text-sm">
                  Episódio {currentEpisode.episode_number}
                  {currentEpisode.title && `: ${currentEpisode.title}`}
                </p>
              </div>
            </div>

            {/* Episodes Dropdown */}
            {episodes.length > 1 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/20 gap-2"
                  onClick={() => setShowEpisodes(!showEpisodes)}
                >
                  <span className="hidden md:inline">Episódios</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showEpisodes ? 'rotate-180' : ''}`} />
                </Button>

                {showEpisodes && (
                  <div className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-y-auto bg-background/95 backdrop-blur-sm rounded-lg shadow-xl border border-border z-50">
                    {episodes.map((episode) => (
                      <button
                        key={episode.id}
                        className={`w-full text-left px-4 py-3 hover:bg-primary/20 transition-colors ${
                          currentEpisode.id === episode.id ? 'bg-primary/30' : ''
                        }`}
                        onClick={() => goToEpisode(episode)}
                      >
                        <p className="font-medium text-sm">
                          Ep. {episode.episode_number}
                          {episode.title && `: ${episode.title}`}
                        </p>
                        {episode.duration_minutes && (
                          <p className="text-xs text-muted-foreground">{episode.duration_minutes} min</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying && (
            <button
              className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center pointer-events-auto hover:bg-primary transition-colors"
              onClick={togglePlay}
            >
              <Play className="h-10 w-10 text-primary-foreground ml-1" />
            </button>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary 
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, rgba(255,255,255,0.3) ${progress}%)`
              }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>

              {/* Skip Backward */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 hidden md:flex"
                onClick={() => skip(-10)}
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              {/* Skip Forward */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 hidden md:flex"
                onClick={() => skip(10)}
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              {/* Volume */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>

              {/* Time */}
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Previous Episode */}
              {episodes.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 hidden md:flex"
                    onClick={goToPreviousEpisode}
                    disabled={episodes.findIndex(ep => ep.id === currentEpisode.id) === 0}
                  >
                    Anterior
                  </Button>

                  {/* Next Episode */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 hidden md:flex"
                    onClick={goToNextEpisode}
                    disabled={episodes.findIndex(ep => ep.id === currentEpisode.id) === episodes.length - 1}
                  >
                    Próximo
                  </Button>
                </>
              )}

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

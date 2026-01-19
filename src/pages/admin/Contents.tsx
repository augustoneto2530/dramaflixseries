import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Pencil, Trash2, Film, Image, Video, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { Content, ContentCategory, Episode } from '@/lib/types';

const categories: { value: ContentCategory; label: string }[] = [
  { value: 'doramas', label: 'Doramas' },
  { value: 'adult', label: '+18' },
  { value: 'novelas', label: 'Novelas' },
  { value: 'filmes', label: 'Filmes' },
  { value: 'series', label: 'Séries' },
];

export default function AdminContents() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contents, setContents] = useState<Content[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingContents, setIsLoadingContents] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEpisodeDialogOpen, setIsEpisodeDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'doramas' as ContentCategory,
    cover_image_url: '',
    banner_image_url: '',
    rating: 0,
    release_year: new Date().getFullYear(),
    is_featured: false,
    is_trending: false,
    is_new: true,
    is_adult: false,
    total_episodes: 1,
  });

  // Episode form state
  const [episodeForm, setEpisodeForm] = useState({
    episode_number: 1,
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    duration_minutes: 0,
  });

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) navigate('/entrar');
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchContents();
  }, [isAdmin]);

  const fetchContents = async () => {
    setIsLoadingContents(true);
    try {
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContents((data || []) as Content[]);
    } catch (err) {
      console.error('Error fetching contents:', err);
      toast({ title: 'Erro', description: 'Erro ao carregar conteúdos', variant: 'destructive' });
    } finally {
      setIsLoadingContents(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Erro', description: 'Título é obrigatório', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare data with proper defaults
      const dataToSave = {
        title: formData.title.trim(),
        description: formData.description || null,
        category: formData.category,
        cover_image_url: formData.cover_image_url || null,
        banner_image_url: formData.banner_image_url || null,
        rating: formData.rating || 0,
        release_year: formData.release_year || new Date().getFullYear(),
        is_featured: formData.is_featured || false,
        is_trending: formData.is_trending || false,
        is_new: formData.is_new ?? true,
        is_adult: formData.is_adult || false,
        total_episodes: formData.total_episodes || 1,
      };

      if (selectedContent) {
        const { error } = await supabase
          .from('contents')
          .update(dataToSave)
          .eq('id', selectedContent.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conteúdo atualizado!' });
      } else {
        const { error } = await supabase.from('contents').insert(dataToSave);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Conteúdo adicionado!' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchContents();
    } catch (err: any) {
      console.error('Error saving content:', err);
      toast({ title: 'Erro', description: err?.message || 'Erro ao salvar conteúdo', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEpisode = async () => {
    if (!selectedContent || !episodeForm.video_url) {
      toast({ title: 'Erro', description: 'URL do vídeo é obrigatória', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('episodes').insert({
        ...episodeForm,
        content_id: selectedContent.id,
      });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Episódio adicionado!' });
      setIsEpisodeDialogOpen(false);
      setEpisodeForm({
        episode_number: 1,
        title: '',
        description: '',
        video_url: '',
        thumbnail_url: '',
        duration_minutes: 0,
      });
    } catch (err) {
      console.error('Error adding episode:', err);
      toast({ title: 'Erro', description: 'Erro ao adicionar episódio', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este conteúdo?')) return;

    try {
      const { error } = await supabase.from('contents').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Conteúdo excluído' });
      fetchContents();
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const openEditDialog = (content: Content) => {
    setSelectedContent(content);
    setFormData({
      title: content.title,
      description: content.description || '',
      category: content.category,
      cover_image_url: content.cover_image_url || '',
      banner_image_url: content.banner_image_url || '',
      rating: content.rating,
      release_year: content.release_year || new Date().getFullYear(),
      is_featured: content.is_featured,
      is_trending: content.is_trending,
      is_new: content.is_new,
      is_adult: content.is_adult,
      total_episodes: content.total_episodes,
    });
    setIsDialogOpen(true);
  };

  const openEpisodeDialog = (content: Content) => {
    setSelectedContent(content);
    setIsEpisodeDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedContent(null);
    setFormData({
      title: '',
      description: '',
      category: 'doramas',
      cover_image_url: '',
      banner_image_url: '',
      rating: 0,
      release_year: new Date().getFullYear(),
      is_featured: false,
      is_trending: false,
      is_new: true,
      is_adult: false,
      total_episodes: 1,
    });
  };

  const filteredContents = contents.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h1 className="text-xl font-bold">Gerenciar Conteúdos</h1>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="brand-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Conteúdo
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoadingContents ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content) => (
              <Card key={content.id} className="overflow-hidden">
                <div className="aspect-[2/3] relative">
                  <img
                    src={content.cover_image_url || '/placeholder.svg'}
                    alt={content.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {content.is_featured && <Badge className="bg-primary">Destaque</Badge>}
                    {content.is_adult && <Badge variant="destructive">+18</Badge>}
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded px-2 py-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span className="text-xs font-medium">{content.rating}</span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-1">{content.title}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{content.category}</p>
                  <div className="flex items-center gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(content)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEpisodeDialog(content)}>
                      <Video className="h-3 w-3 mr-1" />
                      Episódio
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteContent(content.id)} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Content Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContent ? 'Editar' : 'Adicionar'} Conteúdo</DialogTitle>
            <DialogDescription>Preencha os dados do conteúdo. Imagens e vídeos são adicionados via link.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v as ContentCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL da Capa</Label>
                <Input placeholder="https://..." value={formData.cover_image_url} onChange={(e) => setFormData(prev => ({ ...prev, cover_image_url: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>URL do Banner</Label>
                <Input placeholder="https://..." value={formData.banner_image_url} onChange={(e) => setFormData(prev => ({ ...prev, banner_image_url: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nota (0-10)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="10" 
                  step="0.1" 
                  value={formData.rating || ''} 
                  onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value ? parseFloat(e.target.value) : 0 }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input 
                  type="number" 
                  value={formData.release_year || ''} 
                  onChange={(e) => setFormData(prev => ({ ...prev, release_year: e.target.value ? parseInt(e.target.value) : new Date().getFullYear() }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Total Episódios</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={formData.total_episodes || ''} 
                  onChange={(e) => setFormData(prev => ({ ...prev, total_episodes: e.target.value ? parseInt(e.target.value) : 1 }))} 
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={formData.is_featured} onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_featured: v }))} />
                <Label>Em Destaque</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.is_trending} onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_trending: v }))} />
                <Label>Em Alta</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.is_new} onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_new: v }))} />
                <Label>Lançamento</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.is_adult} onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_adult: v }))} />
                <Label>+18</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="brand-gradient">{isSubmitting ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Episode Dialog */}
      <Dialog open={isEpisodeDialogOpen} onOpenChange={setIsEpisodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Episódio</DialogTitle>
            <DialogDescription>Adicione um novo episódio para: {selectedContent?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do Episódio</Label>
                <Input type="number" min="1" value={episodeForm.episode_number} onChange={(e) => setEpisodeForm(prev => ({ ...prev, episode_number: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Duração (minutos)</Label>
                <Input type="number" min="0" value={episodeForm.duration_minutes} onChange={(e) => setEpisodeForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Título do Episódio</Label>
              <Input value={episodeForm.title} onChange={(e) => setEpisodeForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>URL do Vídeo *</Label>
              <Input placeholder="https://pub-xxx.r2.dev/videos/..." value={episodeForm.video_url} onChange={(e) => setEpisodeForm(prev => ({ ...prev, video_url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>URL da Thumbnail</Label>
              <Input placeholder="https://..." value={episodeForm.thumbnail_url} onChange={(e) => setEpisodeForm(prev => ({ ...prev, thumbnail_url: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEpisodeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddEpisode} disabled={isSubmitting} className="brand-gradient">{isSubmitting ? 'Adicionando...' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Content } from '@/lib/types';

// Remove duplicados (mesmo id ou mesmo título)
export function dedupeContents(list: Content[]): Content[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  return list.filter((c) => {
    const key = (c.title || '').trim().toLowerCase();
    if (seenIds.has(c.id) || (key && seenTitles.has(key))) return false;
    seenIds.add(c.id);
    if (key) seenTitles.add(key);
    return true;
  });
}

async function fetchAllContents(): Promise<Content[]> {
  const { data, error } = await supabase
    .from('contents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Content[];
}

/**
 * Catálogo completo em cache: uma única consulta ao banco por sessão
 * (revalidada a cada 10 minutos), compartilhada por Home, Categorias e Busca.
 */
export function useContentsQuery() {
  return useQuery({
    queryKey: ['contents', 'all'],
    queryFn: fetchAllContents,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

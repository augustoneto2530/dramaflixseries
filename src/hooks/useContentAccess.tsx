import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Content } from '@/lib/types';

interface ContentAccessResult {
  hasAccess: boolean;
  accessType: 'full' | 'adult_only' | 'single_content' | 'none';
  purchasedContentIds: string[];
}

interface PurchasedContent {
  content_id: string;
  title: string;
}

// Séries +18 liberadas para assinantes dos planos Mensal e Anual
const SUBSCRIPTION_UNLOCKED_ADULT_IDS = new Set([
  '9aa670dd-725f-4c79-8eb2-2046bc7456c4', // O Filho do meu Marido, Meu Pecado!
  'f81aa496-708e-4154-99b7-1148f4f91f77', // O Filho do meu Chefe
  '1a2b1e56-ed07-4c79-b6b9-be0f6ba70943', // Professora Mia, Segredo Secreto!
  'a46d57ec-b91e-4a63-8b9a-7a7228c74289', // Meu Presente de Solteiro Foi a Mãe da Minha NOIVA
]);

export function useContentAccess() {
  const { user, profile, isAdmin, isLoading: authLoading } = useAuth();

  // Compras em cache: evita repetir a mesma consulta em cada card/página
  const { data: purchasedContents = [], isLoading: purchasesQueryLoading } = useQuery({
    queryKey: ['user-purchases', user?.id],
    enabled: !!user && !authLoading,
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: 'always',
    refetchOnMount: false,
    retry: 1,
    queryFn: async (): Promise<PurchasedContent[]> => {
      const { data, error } = await supabase
        .from('user_content_purchases')
        .select('content_id, contents(title)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data || []).map((p: any) => ({
        content_id: p.content_id,
        title: p.contents?.title || 'Conteúdo Avulso',
      }));
    },
  });

  const purchasedContentIds = useMemo(
    () => purchasedContents.map((p) => p.content_id),
    [purchasedContents]
  );

  const loading = authLoading || (!!user && purchasesQueryLoading);

  const isFutureOrUnlimited = useCallback((endDate: string | null): boolean => {
    return !endDate || new Date(endDate).getTime() > Date.now();
  }, []);

  const hasValidSubscription = useMemo(
    () => !!profile && profile.subscription_status === 'active' && isFutureOrUnlimited(profile.subscription_end_date),
    [profile, isFutureOrUnlimited]
  );

  const hasValidAdultAccess = useMemo(
    () => !!profile?.has_adult_access && isFutureOrUnlimited(profile.adult_access_end_date),
    [profile, isFutureOrUnlimited]
  );



  // Check if user only has single_content access (no subscription)
  const hasSingleContentOnly = useCallback((): boolean => {
    if (!profile) return false;
    
    // User has no active subscription but has purchased content
    const noActiveSubscription = !(profile.is_vip && isFutureOrUnlimited(profile.subscription_end_date)) &&
      (!hasValidSubscription || !profile.plan_type);
    
    return noActiveSubscription && purchasedContentIds.length > 0;
  }, [profile, purchasedContentIds, hasValidSubscription, isFutureOrUnlimited]);

  // Get the first purchased content title for display
  const getPurchasedContentTitle = useCallback((): string | undefined => {
    if (purchasedContents.length > 0) {
      return purchasedContents[0].title;
    }
    return undefined;
  }, [purchasedContents]);

  const checkContentAccess = useCallback((content: Content): ContentAccessResult => {
    // Admin has full access
    if (isAdmin) {
      return { hasAccess: true, accessType: 'full', purchasedContentIds };
    }

    // Not logged in
    if (!user) {
      return { hasAccess: false, accessType: 'none', purchasedContentIds };
    }

    // Check for single content purchase FIRST - even for adult content
    // This allows users with single_content purchases to access their specific content
    if (purchasedContentIds.includes(content.id)) {
      return { hasAccess: true, accessType: 'single_content', purchasedContentIds };
    }

    // Signed-in users can watch regular catalog content without a purchase.
    // +18 and launches remain gated below by plan/VIP/adult/single-content access.
    if (!content.is_adult && !content.is_new) {
      return { hasAccess: true, accessType: 'full', purchasedContentIds };
    }

    if (!profile) {
      return { hasAccess: false, accessType: 'none', purchasedContentIds };
    }

    // VIP has full access
    if (profile.is_vip && isFutureOrUnlimited(profile.subscription_end_date)) {
      return { hasAccess: true, accessType: 'full', purchasedContentIds };
    }

    // Annual subscription has full access
    if (hasValidSubscription && profile.plan_type === 'annual') {
      return { hasAccess: true, accessType: 'full', purchasedContentIds };
    }

    // Monthly/annual subscribers can watch the adult series unlocked for plans
    if (content.is_adult && SUBSCRIPTION_UNLOCKED_ADULT_IDS.has(content.id) && hasValidSubscription && (profile.plan_type === 'monthly' || profile.plan_type === 'annual')) {
      return { hasAccess: true, accessType: 'full', purchasedContentIds };
    }

    // Standalone +18 access also applies when the customer has no monthly plan.
    if (content.is_adult && hasValidAdultAccess) {
      return { hasAccess: true, accessType: 'adult_only', purchasedContentIds };
    }

    // Monthly subscription
    if (hasValidSubscription && profile.plan_type === 'monthly') {
      // Check for adult content - Monthly users NEVER have access to adult content without paying extra
      if (content.is_adult) {
        // Monthly user needs explicit adult access
        if (hasValidAdultAccess) {
          return { hasAccess: true, accessType: 'adult_only', purchasedContentIds };
        }
        // Block access for monthly users without adult access
        return { hasAccess: false, accessType: 'none', purchasedContentIds };
      }
      // Non-adult content is accessible for monthly users
      return { hasAccess: true, accessType: 'full', purchasedContentIds };
    }

    return { hasAccess: false, accessType: 'none', purchasedContentIds };
  }, [user, profile, isAdmin, purchasedContentIds, hasValidSubscription, hasValidAdultAccess, isFutureOrUnlimited]);

  const getBlockedReason = useCallback((content: Content): 'premium' | 'adult' | 'single_content' | null => {
    const accessResult = checkContentAccess(content);
    
    if (accessResult.hasAccess) {
      return null;
    }

    // PRIORITY 1: Adult content without a matching standalone purchase shows adult popup.
    // Matching standalone purchases are already allowed by checkContentAccess above.
    if (content.is_adult) {
      return 'adult';
    }

    // PRIORITY 2: User only has single content access - show single_content popup
    // This only applies for NON-adult content since adult check is done above
    if (hasSingleContentOnly()) {
      return 'single_content';
    }

    // PRIORITY 3: User has monthly subscription but trying to access blocked content
    // (This shouldn't happen for non-adult content with active subscription)
    if (profile?.subscription_status === 'active') {
      return 'premium';
    }

    // PRIORITY 4: No subscription at all - premium popup
    return 'premium';
  }, [profile, checkContentAccess, hasSingleContentOnly]);

  return {
    checkContentAccess,
    getBlockedReason,
    purchasedContentIds,
    purchasedContents,
    hasSingleContentOnly,
    getPurchasedContentTitle,
    loading
  };
}

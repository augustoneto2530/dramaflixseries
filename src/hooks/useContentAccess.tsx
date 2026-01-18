import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Content } from '@/lib/types';

interface ContentAccessResult {
  hasAccess: boolean;
  accessType: 'full' | 'adult_only' | 'single_content' | 'none';
  purchasedContentIds: string[];
}

export function useContentAccess() {
  const { user, profile, isAdmin } = useAuth();
  const [purchasedContentIds, setPurchasedContentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPurchasedContent = async () => {
      if (!user) {
        setPurchasedContentIds([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_content_purchases')
          .select('content_id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Erro ao buscar compras:', error);
        } else {
          setPurchasedContentIds(data?.map(p => p.content_id) || []);
        }
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchasedContent();
  }, [user]);

  const checkContentAccess = useCallback((content: Content): ContentAccessResult => {
    // Admin has full access
    if (isAdmin) {
      return { hasAccess: true, accessType: 'full', purchasedContentIds };
    }

    // Not logged in
    if (!user || !profile) {
      return { hasAccess: false, accessType: 'none', purchasedContentIds };
    }

    // VIP has full access
    if (profile.is_vip) {
      return { hasAccess: true, accessType: 'full', purchasedContentIds };
    }

    // Annual subscription has full access
    if (profile.subscription_status === 'active' && profile.plan_type === 'annual') {
      return { hasAccess: true, accessType: 'full', purchasedContentIds };
    }

    // Monthly subscription
    if (profile.subscription_status === 'active' && profile.plan_type === 'monthly') {
      // Check for adult content - Monthly users NEVER have access to adult content without paying extra
      if (content.is_adult) {
        // Monthly user needs explicit adult access
        if (profile.has_adult_access) {
          return { hasAccess: true, accessType: 'adult_only', purchasedContentIds };
        }
        // Block access for monthly users without adult access
        return { hasAccess: false, accessType: 'none', purchasedContentIds };
      }
      // Non-adult content is accessible for monthly users
      return { hasAccess: true, accessType: 'full', purchasedContentIds };
    }

    // Check for single content purchase
    if (purchasedContentIds.includes(content.id)) {
      return { hasAccess: true, accessType: 'single_content', purchasedContentIds };
    }

    // No access
    return { hasAccess: false, accessType: 'none', purchasedContentIds };
  }, [user, profile, isAdmin, purchasedContentIds]);

  const getBlockedReason = useCallback((content: Content): 'premium' | 'adult' | null => {
    const accessResult = checkContentAccess(content);
    
    if (accessResult.hasAccess) {
      return null;
    }

    // Monthly user trying to access adult content
    if (profile?.subscription_status === 'active' && 
        profile?.plan_type === 'monthly' && 
        content.is_adult && 
        !profile?.has_adult_access) {
      return 'adult';
    }

    // User with only single content purchases
    if (purchasedContentIds.length > 0 && !purchasedContentIds.includes(content.id)) {
      return 'premium';
    }

    // No subscription at all
    return 'premium';
  }, [profile, purchasedContentIds, checkContentAccess]);

  return {
    checkContentAccess,
    getBlockedReason,
    purchasedContentIds,
    loading
  };
}

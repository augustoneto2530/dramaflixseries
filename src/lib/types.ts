export type ContentCategory = 'doramas' | 'adult' | 'novelas' | 'filmes' | 'series';

export type SubscriptionStatus = 'active' | 'inactive' | 'pending' | 'cancelled';

export type PlanType = 'monthly' | 'annual';

export type AppRole = 'admin' | 'user';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: SubscriptionStatus;
  plan_type: PlanType | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  is_vip: boolean;
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  title: string;
  description: string | null;
  category: ContentCategory;
  cover_image_url: string | null;
  banner_image_url: string | null;
  rating: number;
  release_year: number | null;
  is_featured: boolean;
  is_trending: boolean;
  is_new: boolean;
  is_adult: boolean;
  total_episodes: number;
  duration_minutes: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  content_id: string;
  episode_number: number;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  plan_type: PlanType;
  price: number;
  currency: string;
  features: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseWebhook {
  id: string;
  webhook_type: PlanType;
  buyer_email: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_document: string | null;
  product_id: string | null;
  product_name: string | null;
  transaction_id: string | null;
  payment_method: string | null;
  payment_status: string | null;
  amount: number | null;
  currency: string;
  raw_data: Record<string, any>;
  processed: boolean;
  processed_at: string | null;
  user_id: string | null;
  created_at: string;
}

export interface OnlineUser {
  id: string;
  user_id: string;
  last_seen: string;
  is_online: boolean;
  profile?: Profile;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export const CATEGORY_LABELS: Record<ContentCategory, string> = {
  doramas: 'Doramas',
  adult: '+18',
  novelas: 'Novelas',
  filmes: 'Filmes',
  series: 'Séries',
};

export const CATEGORY_COLORS: Record<ContentCategory, string> = {
  doramas: 'category-doramas',
  adult: 'category-adult',
  novelas: 'category-novelas',
  filmes: 'category-filmes',
  series: 'category-series',
};

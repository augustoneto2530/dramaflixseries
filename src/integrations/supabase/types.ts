export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      contents: {
        Row: {
          banner_image_url: string | null
          category: Database["public"]["Enums"]["content_category"]
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_adult: boolean
          is_featured: boolean
          is_new: boolean
          is_trending: boolean
          rating: number | null
          release_year: number | null
          tags: string[] | null
          title: string
          total_episodes: number | null
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          category: Database["public"]["Enums"]["content_category"]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_adult?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_trending?: boolean
          rating?: number | null
          release_year?: number | null
          tags?: string[] | null
          title: string
          total_episodes?: number | null
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          category?: Database["public"]["Enums"]["content_category"]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_adult?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_trending?: boolean
          rating?: number | null
          release_year?: number | null
          tags?: string[] | null
          title?: string
          total_episodes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      episodes: {
        Row: {
          content_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          episode_number: number
          id: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          content_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          episode_number: number
          id?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          content_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          episode_number?: number
          id?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      online_users: {
        Row: {
          id: string
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          adult_access_end_date: string | null
          adult_access_start_date: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          has_adult_access: boolean
          id: string
          is_vip: boolean
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          adult_access_end_date?: string | null
          adult_access_start_date?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          has_adult_access?: boolean
          id?: string
          is_vip?: boolean
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          adult_access_end_date?: string | null
          adult_access_start_date?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          has_adult_access?: boolean
          id?: string
          is_vip?: boolean
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_webhooks: {
        Row: {
          amount: number | null
          buyer_document: string | null
          buyer_email: string
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          currency: string | null
          id: string
          payment_method: string | null
          payment_status: string | null
          processed: boolean
          processed_at: string | null
          product_id: string | null
          product_name: string | null
          raw_data: Json
          transaction_id: string | null
          user_id: string | null
          webhook_type: Database["public"]["Enums"]["plan_type"]
        }
        Insert: {
          amount?: number | null
          buyer_document?: string | null
          buyer_email: string
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          processed?: boolean
          processed_at?: string | null
          product_id?: string | null
          product_name?: string | null
          raw_data: Json
          transaction_id?: string | null
          user_id?: string | null
          webhook_type: Database["public"]["Enums"]["plan_type"]
        }
        Update: {
          amount?: number | null
          buyer_document?: string | null
          buyer_email?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          processed?: boolean
          processed_at?: string | null
          product_id?: string | null
          product_name?: string | null
          raw_data?: Json
          transaction_id?: string | null
          user_id?: string | null
          webhook_type?: Database["public"]["Enums"]["plan_type"]
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_content_purchases: {
        Row: {
          content_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_lifetime: boolean
          purchased_at: string
          transaction_id: string | null
          user_id: string
          webhook_id: string | null
        }
        Insert: {
          content_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_lifetime?: boolean
          purchased_at?: string
          transaction_id?: string | null
          user_id: string
          webhook_id?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_lifetime?: boolean
          purchased_at?: string
          transaction_id?: string | null
          user_id?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_content_purchases_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_content_purchases_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "purchase_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_watchlist: {
        Row: {
          content_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watchlist_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_progress: {
        Row: {
          completed: boolean
          episode_id: string
          id: string
          last_watched_at: string
          progress_seconds: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          episode_id: string
          id?: string
          last_watched_at?: string
          progress_seconds?: number
          user_id: string
        }
        Update: {
          completed?: boolean
          episode_id?: string
          id?: string
          last_watched_at?: string
          progress_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_progress_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      content_category: "doramas" | "adult" | "novelas" | "filmes" | "series"
      plan_type: "monthly" | "annual" | "adult" | "single_content"
      subscription_status: "active" | "inactive" | "pending" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      content_category: ["doramas", "adult", "novelas", "filmes", "series"],
      plan_type: ["monthly", "annual", "adult", "single_content"],
      subscription_status: ["active", "inactive", "pending", "cancelled"],
    },
  },
} as const

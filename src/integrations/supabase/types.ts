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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          id: string
          payload: Json | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_config: {
        Row: {
          automod_anti_invite: boolean
          automod_anti_link: boolean
          automod_anti_spam: boolean
          automod_blocked_words: string[]
          automod_enabled: boolean
          automod_log_channel_id: string | null
          chat_gate_enabled: boolean
          gamemode_log_channel_id: string | null
          id: string
          mod_log_channel_id: string | null
          tier_announce_channel_id: string | null
          tier_announcements_enabled: boolean
          updated_at: string
          welcome_channel_id: string | null
          welcome_message: string
          welcomer_enabled: boolean
        }
        Insert: {
          automod_anti_invite?: boolean
          automod_anti_link?: boolean
          automod_anti_spam?: boolean
          automod_blocked_words?: string[]
          automod_enabled?: boolean
          automod_log_channel_id?: string | null
          chat_gate_enabled?: boolean
          gamemode_log_channel_id?: string | null
          id?: string
          mod_log_channel_id?: string | null
          tier_announce_channel_id?: string | null
          tier_announcements_enabled?: boolean
          updated_at?: string
          welcome_channel_id?: string | null
          welcome_message?: string
          welcomer_enabled?: boolean
        }
        Update: {
          automod_anti_invite?: boolean
          automod_anti_link?: boolean
          automod_anti_spam?: boolean
          automod_blocked_words?: string[]
          automod_enabled?: boolean
          automod_log_channel_id?: string | null
          chat_gate_enabled?: boolean
          gamemode_log_channel_id?: string | null
          id?: string
          mod_log_channel_id?: string | null
          tier_announce_channel_id?: string | null
          tier_announcements_enabled?: boolean
          updated_at?: string
          welcome_channel_id?: string | null
          welcome_message?: string
          welcomer_enabled?: boolean
        }
        Relationships: []
      }
      gamemodes: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          gamemode_id: string
          id: string
          is_draw: boolean
          loser_elo_after: number | null
          loser_elo_before: number | null
          loser_id: string
          loser_score: number
          notes: string | null
          played_at: string
          reported_by: string | null
          season_id: string | null
          status: string
          updated_at: string
          verified_by: string | null
          winner_elo_after: number | null
          winner_elo_before: number | null
          winner_id: string
          winner_score: number
        }
        Insert: {
          created_at?: string
          gamemode_id: string
          id?: string
          is_draw?: boolean
          loser_elo_after?: number | null
          loser_elo_before?: number | null
          loser_id: string
          loser_score?: number
          notes?: string | null
          played_at?: string
          reported_by?: string | null
          season_id?: string | null
          status?: string
          updated_at?: string
          verified_by?: string | null
          winner_elo_after?: number | null
          winner_elo_before?: number | null
          winner_id: string
          winner_score?: number
        }
        Update: {
          created_at?: string
          gamemode_id?: string
          id?: string
          is_draw?: boolean
          loser_elo_after?: number | null
          loser_elo_before?: number | null
          loser_id?: string
          loser_score?: number
          notes?: string | null
          played_at?: string
          reported_by?: string | null
          season_id?: string | null
          status?: string
          updated_at?: string
          verified_by?: string | null
          winner_elo_after?: number | null
          winner_elo_before?: number | null
          winner_id?: string
          winner_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_gamemode_id_fkey"
            columns: ["gamemode_id"]
            isOneToOne: false
            referencedRelation: "gamemodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mod_actions: {
        Row: {
          action: string
          created_at: string
          duration_minutes: number | null
          id: string
          moderator_discord_id: string
          moderator_username: string | null
          reason: string | null
          target_discord_id: string
          target_username: string | null
        }
        Insert: {
          action: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          moderator_discord_id: string
          moderator_username?: string | null
          reason?: string | null
          target_discord_id: string
          target_username?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          moderator_discord_id?: string
          moderator_username?: string | null
          reason?: string | null
          target_discord_id?: string
          target_username?: string | null
        }
        Relationships: []
      }
      player_elo: {
        Row: {
          created_at: string
          current_streak: number
          draws: number
          elo: number
          gamemode_id: string
          last_match_at: string | null
          longest_streak: number
          losses: number
          peak_elo: number
          profile_id: string
          updated_at: string
          wins: number
        }
        Insert: {
          created_at?: string
          current_streak?: number
          draws?: number
          elo?: number
          gamemode_id: string
          last_match_at?: string | null
          longest_streak?: number
          losses?: number
          peak_elo?: number
          profile_id: string
          updated_at?: string
          wins?: number
        }
        Update: {
          created_at?: string
          current_streak?: number
          draws?: number
          elo?: number
          gamemode_id?: string
          last_match_at?: string | null
          longest_streak?: number
          losses?: number
          peak_elo?: number
          profile_id?: string
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_elo_gamemode_id_fkey"
            columns: ["gamemode_id"]
            isOneToOne: false
            referencedRelation: "gamemodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_elo_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_seasons: {
        Row: {
          created_at: string
          draws: number
          final_elo: number
          final_rank: number | null
          gamemode_id: string
          id: string
          losses: number
          peak_elo: number
          profile_id: string
          season_id: string
          wins: number
        }
        Insert: {
          created_at?: string
          draws?: number
          final_elo: number
          final_rank?: number | null
          gamemode_id: string
          id?: string
          losses?: number
          peak_elo: number
          profile_id: string
          season_id: string
          wins?: number
        }
        Update: {
          created_at?: string
          draws?: number
          final_elo?: number
          final_rank?: number | null
          gamemode_id?: string
          id?: string
          losses?: number
          peak_elo?: number
          profile_id?: string
          season_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_seasons_gamemode_id_fkey"
            columns: ["gamemode_id"]
            isOneToOne: false
            referencedRelation: "gamemodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_seasons_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_tiers: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          gamemode_id: string
          id: string
          minecraft_username: string
          minecraft_uuid: string | null
          notes: string | null
          region: Database["public"]["Enums"]["region"]
          tier: Database["public"]["Enums"]["tier_rank"]
          updated_at: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          gamemode_id: string
          id?: string
          minecraft_username: string
          minecraft_uuid?: string | null
          notes?: string | null
          region?: Database["public"]["Enums"]["region"]
          tier: Database["public"]["Enums"]["tier_rank"]
          updated_at?: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          gamemode_id?: string
          id?: string
          minecraft_username?: string
          minecraft_uuid?: string | null
          notes?: string | null
          region?: Database["public"]["Enums"]["region"]
          tier?: Database["public"]["Enums"]["tier_rank"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_tiers_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_tiers_gamemode_id_fkey"
            columns: ["gamemode_id"]
            isOneToOne: false
            referencedRelation: "gamemodes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          discord_avatar: string | null
          discord_id: string | null
          discord_username: string | null
          id: string
          minecraft_username: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord_avatar?: string | null
          discord_id?: string | null
          discord_username?: string | null
          id: string
          minecraft_username?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord_avatar?: string | null
          discord_id?: string | null
          discord_username?: string | null
          id?: string
          minecraft_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          name: string
          starts_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          name: string
          starts_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string
          starts_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          active_theme_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active_theme_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          active_theme_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_active_theme_id_fkey"
            columns: ["active_theme_id"]
            isOneToOne: false
            referencedRelation: "site_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      site_themes: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          vars: Json
        }
        Insert: {
          category?: string
          created_at?: string
          id: string
          name: string
          sort_order?: number
          updated_at?: string
          vars: Json
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          vars?: Json
        }
        Relationships: []
      }
      user_levels: {
        Row: {
          created_at: string
          discord_id: string
          discord_username: string | null
          last_message_at: string | null
          level: number
          updated_at: string
          xp: number
        }
        Insert: {
          created_at?: string
          discord_id: string
          discord_username?: string | null
          last_message_at?: string | null
          level?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          created_at?: string
          discord_id?: string
          discord_username?: string | null
          last_message_at?: string | null
          level?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warnings: {
        Row: {
          created_at: string
          discord_id: string
          discord_username: string | null
          id: string
          moderator_discord_id: string
          moderator_username: string | null
          reason: string
        }
        Insert: {
          created_at?: string
          discord_id: string
          discord_username?: string | null
          id?: string
          moderator_discord_id: string
          moderator_username?: string | null
          reason: string
        }
        Update: {
          created_at?: string
          discord_id?: string
          discord_username?: string | null
          id?: string
          moderator_discord_id?: string
          moderator_username?: string | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_elo_row: {
        Args: { _gamemode_id: string; _profile_id: string }
        Returns: {
          created_at: string
          current_streak: number
          draws: number
          elo: number
          gamemode_id: string
          last_match_at: string | null
          longest_streak: number
          losses: number
          peak_elo: number
          profile_id: string
          updated_at: string
          wins: number
        }
        SetofOptions: {
          from: "*"
          to: "player_elo"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_locked_owner_roles: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_locked_owner: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      verify_match: {
        Args: { _match_id: string }
        Returns: {
          created_at: string
          gamemode_id: string
          id: string
          is_draw: boolean
          loser_elo_after: number | null
          loser_elo_before: number | null
          loser_id: string
          loser_score: number
          notes: string | null
          played_at: string
          reported_by: string | null
          season_id: string | null
          status: string
          updated_at: string
          verified_by: string | null
          winner_elo_after: number | null
          winner_elo_before: number | null
          winner_id: string
          winner_score: number
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "tester" | "user"
      region: "NA" | "EU" | "AS" | "SA" | "OC" | "AF" | "Unknown"
      tier_rank:
        | "HT1"
        | "LT1"
        | "HT2"
        | "LT2"
        | "HT3"
        | "LT3"
        | "HT4"
        | "LT4"
        | "HT5"
        | "LT5"
        | "Retired"
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
      app_role: ["owner", "admin", "tester", "user"],
      region: ["NA", "EU", "AS", "SA", "OC", "AF", "Unknown"],
      tier_rank: [
        "HT1",
        "LT1",
        "HT2",
        "LT2",
        "HT3",
        "LT3",
        "HT4",
        "LT4",
        "HT5",
        "LT5",
        "Retired",
      ],
    },
  },
} as const

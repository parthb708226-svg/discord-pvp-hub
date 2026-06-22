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
    PostgrestVersion: "14.5"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
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

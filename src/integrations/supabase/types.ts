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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          id: string
          is_used: boolean
          product_name: string | null
          purchase_id: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          is_used?: boolean
          product_name?: string | null
          purchase_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          is_used?: boolean
          product_name?: string | null
          purchase_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      active_sessions: {
        Row: {
          created_at: string
          distance_km: number | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          pace_per_km: string | null
          route_snapshot_url: string | null
          started_at: string
          steps: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          pace_per_km?: string | null
          route_snapshot_url?: string | null
          started_at?: string
          steps?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          pace_per_km?: string | null
          route_snapshot_url?: string | null
          started_at?: string
          steps?: number | null
          user_id?: string
        }
        Relationships: []
      }
      audiobook_bookmarks: {
        Row: {
          chapter_id: number
          created_at: string
          id: string
          label: string | null
          timestamp_seconds: number
          user_id: string
        }
        Insert: {
          chapter_id: number
          created_at?: string
          id?: string
          label?: string | null
          timestamp_seconds: number
          user_id: string
        }
        Update: {
          chapter_id?: number
          created_at?: string
          id?: string
          label?: string | null
          timestamp_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_steps: {
        Row: {
          anomaly_detected: boolean | null
          calories: number | null
          created_at: string
          date: string
          distance_km: number | null
          id: string
          steps: number
          target_hit: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          anomaly_detected?: boolean | null
          calories?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          id?: string
          steps?: number
          target_hit?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          anomaly_detected?: boolean | null
          calories?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          id?: string
          steps?: number
          target_hit?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      friend_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_groups: {
        Row: {
          created_at: string | null
          created_by: string
          emoji: string | null
          id: string
          join_code: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          emoji?: string | null
          id?: string
          join_code: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          emoji?: string | null
          id?: string
          join_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invitations: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          invited_by: string
          invited_user_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          invited_by: string
          invited_user_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_id: string | null
          avatar_initials: string | null
          avatar_url: string | null
          country: string | null
          created_at: string
          daily_step_goal: number | null
          data_source: string | null
          display_name: string
          first_name: string | null
          gender: string | null
          height_cm: number | null
          id: string
          last_name: string | null
          marketing_consent_at: string | null
          newsletter_subscribed: boolean | null
          phone_number: string | null
          profile_completed: boolean | null
          registration_source: string | null
          show_on_leaderboard: boolean | null
          unit_preference: string | null
          updated_at: string
          username: string | null
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          avatar_id?: string | null
          avatar_initials?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          daily_step_goal?: number | null
          data_source?: string | null
          display_name: string
          first_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id: string
          last_name?: string | null
          marketing_consent_at?: string | null
          newsletter_subscribed?: boolean | null
          phone_number?: string | null
          profile_completed?: boolean | null
          registration_source?: string | null
          show_on_leaderboard?: boolean | null
          unit_preference?: string | null
          updated_at?: string
          username?: string | null
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          avatar_id?: string | null
          avatar_initials?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          daily_step_goal?: number | null
          data_source?: string | null
          display_name?: string
          first_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          last_name?: string | null
          marketing_consent_at?: string | null
          newsletter_subscribed?: boolean | null
          phone_number?: string | null
          profile_completed?: boolean | null
          registration_source?: string | null
          show_on_leaderboard?: boolean | null
          unit_preference?: string | null
          updated_at?: string
          username?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      protocol_tasks: {
        Row: {
          created_at: string
          date: string
          id: string
          no_alcohol: boolean
          read_chapter: boolean
          steps_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          no_alcohol?: boolean
          read_chapter?: boolean
          steps_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          no_alcohol?: boolean
          read_chapter?: boolean
          steps_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          current_streak: number
          id: string
          last_target_hit_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_target_hit_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_target_hit_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          daily_reminders: boolean
          evening_reminder_time: string
          leaderboard_updates: boolean
          morning_reminder_time: string
          quiet_hours_end: string
          quiet_hours_start: string
          step_alerts: boolean
          streak_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_reminders?: boolean
          evening_reminder_time?: string
          leaderboard_updates?: boolean
          morning_reminder_time?: string
          quiet_hours_end?: string
          quiet_hours_start?: string
          step_alerts?: boolean
          streak_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_reminders?: boolean
          evening_reminder_time?: string
          leaderboard_updates?: boolean
          morning_reminder_time?: string
          quiet_hours_end?: string
          quiet_hours_start?: string
          step_alerts?: boolean
          streak_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_push_tokens: {
        Row: {
          created_at: string
          device_type: string
          id: string
          push_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type: string
          id?: string
          push_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string
          id?: string
          push_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_country_leaderboard: {
        Args: { target_country: string }
        Returns: {
          avatar_id: string
          avatar_initials: string
          avatar_url: string
          current_streak: number
          display_name: string
          qualified: boolean
          rank: number
          steps: number
          user_id: string
          username: string
        }[]
      }
      get_group_leaderboard: {
        Args: { target_group_id: string }
        Returns: {
          avatar_id: string
          avatar_initials: string
          avatar_url: string
          current_streak: number
          display_name: string
          qualified: boolean
          rank: number
          steps: number
          user_id: string
          username: string
        }[]
      }
      get_monthly_leaderboard: {
        Args: never
        Returns: {
          avatar_id: string
          avatar_initials: string
          avatar_url: string
          current_streak: number
          display_name: string
          qualified: boolean
          rank: number
          total_steps: number
          user_id: string
          username: string
        }[]
      }
      get_pending_invitations: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          group_emoji: string
          group_id: string
          group_name: string
          id: string
          invited_by_avatar: string
          invited_by_name: string
          member_count: number
        }[]
      }
      get_today_leaderboard: {
        Args: never
        Returns: {
          avatar_id: string
          avatar_initials: string
          avatar_url: string
          calories: number
          current_streak: number
          display_name: string
          distance_km: number
          qualified: boolean
          rank: number
          steps: number
          user_id: string
          username: string
        }[]
      }
      get_weekly_leaderboard: {
        Args: never
        Returns: {
          avatar_id: string
          avatar_initials: string
          avatar_url: string
          current_streak: number
          display_name: string
          qualified: boolean
          rank: number
          total_steps: number
          user_id: string
          username: string
        }[]
      }
      group_exists_by_id: { Args: { gid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: { Args: { gid: string }; Returns: boolean }
      lookup_group_by_code: {
        Args: { code: string }
        Returns: {
          group_emoji: string
          group_id: string
          group_name: string
          member_count: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      search_users_for_invite: {
        Args: { exclude_group_id: string; search_query: string }
        Returns: {
          already_invited: boolean
          already_member: boolean
          avatar_id: string
          avatar_initials: string
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const

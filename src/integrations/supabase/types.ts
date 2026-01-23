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
      profiles: {
        Row: {
          age: number | null
          avatar_initials: string | null
          created_at: string
          daily_step_goal: number | null
          data_source: string | null
          display_name: string
          gender: string | null
          height_cm: number | null
          id: string
          profile_completed: boolean | null
          show_on_leaderboard: boolean | null
          unit_preference: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          avatar_initials?: string | null
          created_at?: string
          daily_step_goal?: number | null
          data_source?: string | null
          display_name: string
          gender?: string | null
          height_cm?: number | null
          id: string
          profile_completed?: boolean | null
          show_on_leaderboard?: boolean | null
          unit_preference?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          avatar_initials?: string | null
          created_at?: string
          daily_step_goal?: number | null
          data_source?: string | null
          display_name?: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          profile_completed?: boolean | null
          show_on_leaderboard?: boolean | null
          unit_preference?: string | null
          updated_at?: string
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
      check_access_code: {
        Args: { code_input: string }
        Returns: {
          id: string
          is_valid: boolean
        }[]
      }
      get_monthly_leaderboard: {
        Args: never
        Returns: {
          avatar_initials: string
          current_streak: number
          display_name: string
          rank: number
          total_steps: number
          user_id: string
        }[]
      }
      get_today_leaderboard: {
        Args: never
        Returns: {
          avatar_initials: string
          calories: number
          current_streak: number
          display_name: string
          distance_km: number
          rank: number
          steps: number
          user_id: string
        }[]
      }
      get_weekly_leaderboard: {
        Args: never
        Returns: {
          avatar_initials: string
          current_streak: number
          display_name: string
          rank: number
          total_steps: number
          user_id: string
        }[]
      }
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

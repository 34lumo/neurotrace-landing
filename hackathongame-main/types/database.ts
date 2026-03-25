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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      patients: {
        Row: {
          affected_side: string | null
          age: number | null
          created_at: string | null
          id: string
          name: string | null
          stroke_date: string | null
        }
        Insert: {
          affected_side?: string | null
          age?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          stroke_date?: string | null
        }
        Update: {
          affected_side?: string | null
          age?: number | null
          created_at?: string | null
          id?: string
          name?: string
          stroke_date?: string | null
        }
        Relationships: []
      }
      repetitions: {
        Row: {
          created_at: string | null
          difficulty_level: number | null
          discovery_time_ms: number | null
          eye_hand_latency_ms: number | null
          gaze_stability_variance: number | null
          hit: boolean | null
          id: string
          movement_speed: number | null
          precision_px: number | null
          raw_telemetry: Json
          reaction_time_ms: number | null
          rep_index: number
          session_id: string | null
          target_side: string | null
          target_size: number | null
          target_x: number | null
          target_y: number | null
        }
        Insert: {
          created_at?: string | null
          difficulty_level?: number | null
          discovery_time_ms?: number | null
          eye_hand_latency_ms?: number | null
          gaze_stability_variance?: number | null
          hit?: boolean | null
          id?: string
          movement_speed?: number | null
          precision_px?: number | null
          raw_telemetry: Json
          reaction_time_ms?: number | null
          rep_index: number
          session_id?: string | null
          target_side?: string | null
          target_size?: number | null
          target_x?: number | null
          target_y?: number | null
        }
        Update: {
          created_at?: string | null
          difficulty_level?: number | null
          discovery_time_ms?: number | null
          eye_hand_latency_ms?: number | null
          gaze_stability_variance?: number | null
          hit?: boolean | null
          id?: string
          movement_speed?: number | null
          precision_px?: number | null
          raw_telemetry?: Json
          reaction_time_ms?: number | null
          rep_index?: number
          session_id?: string | null
          target_side?: string | null
          target_size?: number | null
          target_x?: number | null
          target_y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repetitions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_metrics: {
        Row: {
          asymmetry_precision: number | null
          asymmetry_reaction: number | null
          avg_discovery_time_ms: number | null
          avg_eye_hand_latency_ms: number | null
          avg_gaze_stability_variance: number | null
          avg_movement_speed: number | null
          avg_precision_px: number | null
          avg_reaction_time_ms: number | null
          coverage_percent: number | null
          created_at: string | null
          fatigue_detected: boolean | null
          fatigue_index: number | null
          fatigue_onset_rep: number | null
          heatmap_grid: Json | null
          id: string
          neglect_index: number | null
          session_id: string | null
        }
        Insert: {
          asymmetry_precision?: number | null
          asymmetry_reaction?: number | null
          avg_discovery_time_ms?: number | null
          avg_eye_hand_latency_ms?: number | null
          avg_gaze_stability_variance?: number | null
          avg_movement_speed?: number | null
          avg_precision_px?: number | null
          avg_reaction_time_ms?: number | null
          coverage_percent?: number | null
          created_at?: string | null
          fatigue_detected?: boolean | null
          fatigue_index?: number | null
          fatigue_onset_rep?: number | null
          heatmap_grid?: Json | null
          id?: string
          neglect_index?: number | null
          session_id?: string | null
        }
        Update: {
          asymmetry_precision?: number | null
          asymmetry_reaction?: number | null
          avg_discovery_time_ms?: number | null
          avg_eye_hand_latency_ms?: number | null
          avg_gaze_stability_variance?: number | null
          avg_movement_speed?: number | null
          avg_precision_px?: number | null
          avg_reaction_time_ms?: number | null
          coverage_percent?: number | null
          created_at?: string | null
          fatigue_detected?: boolean | null
          fatigue_index?: number | null
          fatigue_onset_rep?: number | null
          heatmap_grid?: Json | null
          id?: string
          neglect_index?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed_reps: number | null
          created_at: string | null
          difficulty_end: number | null
          difficulty_start: number | null
          duration_seconds: number | null
          end_reason: string | null
          ended_at: string | null
          eye_tracking_available: boolean | null
          id: string
          patient_id: string | null
          started_at: string
          total_reps: number | null
        }
        Insert: {
          completed_reps?: number | null
          created_at?: string | null
          difficulty_end?: number | null
          difficulty_start?: number | null
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          eye_tracking_available?: boolean | null
          id?: string
          patient_id?: string | null
          started_at: string
          total_reps?: number | null
        }
        Update: {
          completed_reps?: number | null
          created_at?: string | null
          difficulty_end?: number | null
          difficulty_start?: number | null
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          eye_tracking_available?: boolean | null
          id?: string
          patient_id?: string | null
          started_at?: string
          total_reps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
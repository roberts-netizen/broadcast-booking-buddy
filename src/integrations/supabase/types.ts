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
      booking_taker_assignments: {
        Row: {
          actual_channel_id: string
          booking_id: string
          created_at: string
          id: string
          slot_number: number
          taker_channel_map_id: string | null
          taker_id: string | null
          updated_at: string
        }
        Insert: {
          actual_channel_id?: string
          booking_id: string
          created_at?: string
          id?: string
          slot_number: number
          taker_channel_map_id?: string | null
          taker_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_channel_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          slot_number?: number
          taker_channel_map_id?: string | null
          taker_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_taker_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_taker_assignments_taker_channel_map_id_fkey"
            columns: ["taker_channel_map_id"]
            isOneToOne: false
            referencedRelation: "taker_channel_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_taker_assignments_taker_id_fkey"
            columns: ["taker_id"]
            isOneToOne: false
            referencedRelation: "takers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          cet_time: string | null
          created_at: string
          date: string
          event_name: string
          gmt_time: string
          id: string
          incoming_channel_id: string | null
          league_id: string | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          cet_time?: string | null
          created_at?: string
          date?: string
          event_name?: string
          gmt_time?: string
          id?: string
          incoming_channel_id?: string | null
          league_id?: string | null
          updated_at?: string
          work_order_id?: string
        }
        Update: {
          cet_time?: string | null
          created_at?: string
          date?: string
          event_name?: string
          gmt_time?: string
          id?: string
          incoming_channel_id?: string | null
          league_id?: string | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_incoming_channel_id_fkey"
            columns: ["incoming_channel_id"]
            isOneToOne: false
            referencedRelation: "incoming_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_channels: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      leagues: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      taker_assignments: {
        Row: {
          audio: string | null
          booking_id: string
          communication_method: string | null
          communication_notes: string | null
          created_at: string
          email_subject: string | null
          host: string | null
          id: string
          password: string | null
          port: string | null
          protocol: string | null
          quality: string | null
          sort_order: number
          stream_key_or_channel_id: string | null
          taker_id: string | null
          test_datetime: string | null
          test_notes: string | null
          test_status: string
          tested_by: string | null
          updated_at: string
          username: string | null
          whatsapp_details: string | null
        }
        Insert: {
          audio?: string | null
          booking_id: string
          communication_method?: string | null
          communication_notes?: string | null
          created_at?: string
          email_subject?: string | null
          host?: string | null
          id?: string
          password?: string | null
          port?: string | null
          protocol?: string | null
          quality?: string | null
          sort_order?: number
          stream_key_or_channel_id?: string | null
          taker_id?: string | null
          test_datetime?: string | null
          test_notes?: string | null
          test_status?: string
          tested_by?: string | null
          updated_at?: string
          username?: string | null
          whatsapp_details?: string | null
        }
        Update: {
          audio?: string | null
          booking_id?: string
          communication_method?: string | null
          communication_notes?: string | null
          created_at?: string
          email_subject?: string | null
          host?: string | null
          id?: string
          password?: string | null
          port?: string | null
          protocol?: string | null
          quality?: string | null
          sort_order?: number
          stream_key_or_channel_id?: string | null
          taker_id?: string | null
          test_datetime?: string | null
          test_notes?: string | null
          test_status?: string
          tested_by?: string | null
          updated_at?: string
          username?: string | null
          whatsapp_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taker_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taker_assignments_taker_id_fkey"
            columns: ["taker_id"]
            isOneToOne: false
            referencedRelation: "takers"
            referencedColumns: ["id"]
          },
        ]
      }
      taker_channel_maps: {
        Row: {
          active: boolean
          actual_channel_id: string
          created_at: string
          id: string
          label: string
          taker_id: string | null
        }
        Insert: {
          active?: boolean
          actual_channel_id: string
          created_at?: string
          id?: string
          label: string
          taker_id?: string | null
        }
        Update: {
          active?: boolean
          actual_channel_id?: string
          created_at?: string
          id?: string
          label?: string
          taker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taker_channel_maps_taker_id_fkey"
            columns: ["taker_id"]
            isOneToOne: false
            referencedRelation: "takers"
            referencedColumns: ["id"]
          },
        ]
      }
      takers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
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

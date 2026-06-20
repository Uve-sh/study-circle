export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SessionStatus = 'pending' | 'completed' | 'partial' | 'late' | 'missed'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          joined_at?: string
        }
        Relationships: []
      }
      session_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          start_time: string
          duration_minutes: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          start_time: string
          duration_minutes: number
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          start_time?: string
          duration_minutes?: number
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          id: string
          template_id: string
          user_id: string
          date: string
          status: SessionStatus
          actual_minutes_completed: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          user_id: string
          date: string
          status?: SessionStatus
          actual_minutes_completed?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          user_id?: string
          date?: string
          status?: SessionStatus
          actual_minutes_completed?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      active_timers: {
        Row: {
          user_id: string
          template_id: string | null
          status: 'running' | 'paused'
          start_time: string
          last_paused_at: string | null
          accumulated_seconds: number
          mode: 'countdown' | 'stopwatch'
          duration_minutes: number | null
          updated_at: string
        }
        Insert: {
          user_id: string
          template_id?: string | null
          status?: 'running' | 'paused'
          start_time?: string
          last_paused_at?: string | null
          accumulated_seconds?: number
          mode?: 'countdown' | 'stopwatch'
          duration_minutes?: number | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          template_id?: string | null
          status?: 'running' | 'paused'
          start_time?: string
          last_paused_at?: string | null
          accumulated_seconds?: number
          mode?: 'countdown' | 'stopwatch'
          duration_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          default_focus_duration: number
          default_break_duration: number
          timer_behavior: string
          notifications_enabled: boolean
          study_reminders_enabled: boolean
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          default_focus_duration?: number
          default_break_duration?: number
          timer_behavior?: string
          notifications_enabled?: boolean
          study_reminders_enabled?: boolean
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          default_focus_duration?: number
          default_break_duration?: number
          timer_behavior?: string
          notifications_enabled?: boolean
          study_reminders_enabled?: boolean
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      calculate_streak: {
        Args: { p_user_id: string }
        Returns: number
      }
      leaderboard_scores: {
        Args: { p_group_id: string }
        Returns: {
          user_id: string
          name: string
          avatar_url: string | null
          weekly_hours: number
          current_streak: number
          score: number
        }[]
      }
    }
    Enums: {
      session_status: SessionStatus
    }
    CompositeTypes: Record<string, never>
  }
}

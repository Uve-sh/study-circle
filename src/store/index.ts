import { create } from 'zustand';
import type { Database, SessionStatus } from '@/lib/supabase/database.types';

// Re-export types from the database schema for consistent typing across the app
export type { SessionStatus };
export type User = Database['public']['Tables']['users']['Row'];
export type Group = Database['public']['Tables']['groups']['Row'];
export type SessionTemplate = Database['public']['Tables']['session_templates']['Row'];
export type SessionLog = Database['public']['Tables']['session_logs']['Row'];

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  weekly_hours: number;
  current_streak: number;
  score: number;
}

// ============================================================
// INITIAL MOCK DATA
// (Replaced by real Supabase fetches once keys are configured)
// ============================================================
const today = new Date().toISOString().split('T')[0];

const MOCK_USER: User = {
  id: 'u1',
  name: 'Ahmed',
  avatar_url: null,
  created_at: new Date().toISOString(),
};

const MOCK_TEMPLATES: SessionTemplate[] = [
  { id: 't1', user_id: 'u1', name: 'Session 1', start_time: '07:00:00', duration_minutes: 60, order_index: 0, created_at: today },
  { id: 't2', user_id: 'u1', name: 'Session 2', start_time: '11:00:00', duration_minutes: 90, order_index: 1, created_at: today },
  { id: 't3', user_id: 'u1', name: 'Session 3', start_time: '16:00:00', duration_minutes: 120, order_index: 2, created_at: today },
  { id: 't4', user_id: 'u1', name: 'Session 4', start_time: '20:00:00', duration_minutes: 60, order_index: 3, created_at: today },
];

const MOCK_LOGS: SessionLog[] = [
  { id: 'l1', template_id: 't1', user_id: 'u1', date: today, status: 'completed', actual_minutes_completed: 60, notes: null, created_at: today, updated_at: today },
  { id: 'l2', template_id: 't2', user_id: 'u1', date: today, status: 'missed', actual_minutes_completed: null, notes: null, created_at: today, updated_at: today },
  { id: 'l3', template_id: 't3', user_id: 'u1', date: today, status: 'pending', actual_minutes_completed: null, notes: null, created_at: today, updated_at: today },
  { id: 'l4', template_id: 't4', user_id: 'u1', date: today, status: 'pending', actual_minutes_completed: null, notes: null, created_at: today, updated_at: today },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { user_id: 'u1', name: 'Ahmed', avatar_url: null, weekly_hours: 28, current_streak: 14, score: 22.4 },
  { user_id: 'u2', name: 'Uvesh', avatar_url: null, weekly_hours: 24, current_streak: 12, score: 19.2 },
  { user_id: 'u3', name: 'Ali', avatar_url: null, weekly_hours: 18, current_streak: 5, score: 12.8 },
];

// ============================================================
// STORE INTERFACE
// ============================================================
interface AppState {
  // Data
  user: User | null;
  templates: SessionTemplate[];
  logs: SessionLog[];
  currentStreak: number;
  leaderboard: LeaderboardEntry[];
  activeGroupId: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTemplates: (templates: SessionTemplate[]) => void;
  setLogs: (logs: SessionLog[]) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  setActiveGroupId: (groupId: string | null) => void;

  // Optimistic session update
  // Real update hits Supabase then falls back to this if error
  updateSessionStatus: (
    logId: string,
    status: SessionStatus,
    actualMinutes?: number
  ) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Defaults use mock data — replaced by real data after auth
  user: MOCK_USER,
  templates: MOCK_TEMPLATES,
  logs: MOCK_LOGS,
  currentStreak: 14,
  leaderboard: MOCK_LEADERBOARD,
  activeGroupId: null,

  setUser: (user) => set({ user }),
  setTemplates: (templates) => set({ templates }),
  setLogs: (logs) => set({ logs }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setActiveGroupId: (activeGroupId) => set({ activeGroupId }),

  // Optimistic update: mutates local state immediately
  // Server sync is handled at the component/action level
  updateSessionStatus: (logId, status, actualMinutes) =>
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === logId
          ? { ...log, status, actual_minutes_completed: actualMinutes ?? log.actual_minutes_completed, updated_at: new Date().toISOString() }
          : log
      ),
    })),
}));

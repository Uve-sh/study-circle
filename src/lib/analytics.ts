export type EventName = 
  | 'session_completed'
  | 'session_partial'
  | 'session_marked_late'
  | 'session_missed'
  | 'streak_broken'
  | 'streak_extended'
  | 'group_joined'
  | 'leaderboard_viewed'
  | 'schedule_viewed'
  | 'settings_updated';

class Analytics {
  track(event: EventName, properties?: Record<string, any>) {
    // For now, log to console as requested.
    // Later, this will be wired up to PostHog, Mixpanel, or custom Supabase logging.
    console.log(`[Analytics] ${event}`, properties || {});
  }
}

export const analytics = new Analytics();

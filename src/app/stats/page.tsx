import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsClient from './StatsClient'

export default async function Stats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  // Parallel fetch: streak, 30d logs, total done, weekly logs — 1 round-trip instead of 4
  const [streakRes, logsRes, totalDoneRes, weeklyLogsRes] = await Promise.all([
    supabase.rpc('calculate_streak', { p_user_id: user.id }),
    supabase
      .from('session_logs')
      .select('date, status, actual_minutes_completed, template_id')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false }),
    supabase
      .from('session_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['completed', 'late']),
    supabase
      .from('session_logs')
      .select('actual_minutes_completed')
      .eq('user_id', user.id)
      .gte('date', weekAgo.toISOString().split('T')[0])
      .in('status', ['completed', 'late', 'partial']),
  ])

  const currentStreak = (streakRes.data as number) ?? 0
  const weeklyMinutes = (weeklyLogsRes.data ?? []).reduce(
    (sum, l) => sum + (l.actual_minutes_completed ?? 0), 0
  )

  return (
    <StatsClient
      currentStreak={currentStreak}
      logs={logsRes.data ?? []}
      totalDone={totalDoneRes.count ?? 0}
      weeklyHours={Math.round((weeklyMinutes / 60) * 10) / 10}
    />
  )
}


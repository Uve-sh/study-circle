import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsClient from './StatsClient'

export default async function Stats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Real streak
  const { data: streakData } = await supabase.rpc('calculate_streak', { p_user_id: user.id })
  const currentStreak = (streakData as number) ?? 0

  // Last 30 days of logs
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: logs } = await supabase
    .from('session_logs')
    .select('date, status, actual_minutes_completed, template_id')
    .eq('user_id', user.id)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Total completed sessions all time
  const { count: totalDone } = await supabase
    .from('session_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['completed', 'late'])

  // Weekly hours
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { data: weeklyLogs } = await supabase
    .from('session_logs')
    .select('actual_minutes_completed')
    .eq('user_id', user.id)
    .gte('date', weekAgo.toISOString().split('T')[0])
    .in('status', ['completed', 'late', 'partial'])

  const weeklyMinutes = (weeklyLogs ?? []).reduce(
    (sum, l) => sum + (l.actual_minutes_completed ?? 0), 0
  )

  return (
    <StatsClient
      currentStreak={currentStreak}
      logs={logs ?? []}
      totalDone={totalDone ?? 0}
      weeklyHours={Math.round((weeklyMinutes / 60) * 10) / 10}
    />
  )
}

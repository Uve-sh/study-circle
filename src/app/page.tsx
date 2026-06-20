import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeClient from './HomeClient'

export default async function Home() {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date().toISOString().split('T')[0]

  // Parallel fetch: profile, templates, today's logs, streak — 1 round-trip instead of 5
  const [profileRes, templatesRes, logsRes, streakRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('session_templates').select('*').eq('user_id', user.id).order('order_index', { ascending: true }),
    supabase.from('session_logs').select('*').eq('user_id', user.id).eq('date', today),
    supabase.rpc('calculate_streak', { p_user_id: user.id }),
  ])

  let finalTemplates = templatesRes.data ?? []
  let logs = logsRes.data ?? []
  const currentStreak = (streakRes.data as number) ?? 0

  // Seed default templates only for brand-new users (rare path)
  if (finalTemplates.length === 0) {
    const defaults = [
      { user_id: user.id, name: 'Session 1', start_time: '07:00:00', duration_minutes: 60, order_index: 0 },
      { user_id: user.id, name: 'Session 2', start_time: '11:00:00', duration_minutes: 90, order_index: 1 },
      { user_id: user.id, name: 'Session 3', start_time: '16:00:00', duration_minutes: 120, order_index: 2 },
      { user_id: user.id, name: 'Session 4', start_time: '20:00:00', duration_minutes: 60, order_index: 3 },
    ]
    const { data: seeded } = await supabase
      .from('session_templates')
      .insert(defaults)
      .select()
    finalTemplates = seeded ?? []
  }

  // Removed UTC pending log insertions. 
  // HomeClient will now dynamically render scheduled sessions as pending 
  // without polluting the database with timezone-conflicting dummy records.

  return (
    <HomeClient
      profile={profileRes.data ?? { id: user.id, name: user.email?.split('@')[0] ?? 'Friend', avatar_url: null, created_at: new Date().toISOString() }}
      templates={finalTemplates}
      initialLogs={logs}
      currentStreak={currentStreak}
      userId={user.id}
      today={today}
    />
  )
}

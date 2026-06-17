import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeClient from './HomeClient'

export default async function Home() {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date().toISOString().split('T')[0]

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch session templates ordered correctly
  const { data: templates } = await supabase
    .from('session_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('order_index', { ascending: true })

  // If no templates exist yet, seed default ones for this user
  let finalTemplates = templates ?? []
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

  // Upsert today's logs (creates pending logs if none exist)
  if (finalTemplates.length > 0) {
    await supabase.from('session_logs').upsert(
      finalTemplates.map(t => ({
        template_id: t.id,
        user_id: user.id,
        date: today,
        status: 'pending' as const,
      })),
      { onConflict: 'template_id,user_id,date', ignoreDuplicates: true }
    )
  }

  // Fetch today's logs
  const { data: logs } = await supabase
    .from('session_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)

  // Calculate streak server-side
  const { data: streakData } = await supabase
    .rpc('calculate_streak', { p_user_id: user.id })
  const currentStreak = (streakData as number) ?? 0

  return (
    <HomeClient
      profile={profile ?? { id: user.id, name: user.email?.split('@')[0] ?? 'Friend', avatar_url: null, created_at: new Date().toISOString() }}
      templates={finalTemplates}
      initialLogs={logs ?? []}
      currentStreak={currentStreak}
      userId={user.id}
      today={today}
    />
  )
}

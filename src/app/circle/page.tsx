import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CircleClient from './CircleClient'

export default async function Circle() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get user's groups
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, invite_code)')
    .eq('user_id', user.id)

  const groups = (memberships ?? []).map((m: any) => m.groups).filter(Boolean)

  // Default to first group
  const activeGroup = groups[0] ?? null

  // If they have a group, fetch leaderboard scores via RPC
  let leaderboard: any[] = []
  if (activeGroup) {
    const { data } = await supabase.rpc('leaderboard_scores', { p_group_id: activeGroup.id })
    leaderboard = data ?? []
  }

  return (
    <CircleClient
      userId={user.id}
      groups={groups}
      activeGroup={activeGroup}
      initialLeaderboard={leaderboard}
    />
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScheduleClient from './ScheduleClient'

export default async function Schedule() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: templates } = await supabase
    .from('session_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('order_index', { ascending: true })

  return <ScheduleClient initialTemplates={templates ?? []} userId={user.id} />
}

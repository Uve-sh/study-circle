'use server';

import { createClient } from '@/lib/supabase/server';
import type { SessionStatus } from '@/lib/supabase/database.types';

export async function getOrCreateTodaysLogs(userId: string, templates: { id: string }[]) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const logsToUpsert = templates.map((t) => ({
    template_id: t.id,
    user_id: userId,
    date: today,
    status: 'pending' as SessionStatus,
  }));

  const { data, error } = await supabase
    .from('session_logs')
    .upsert(logsToUpsert, { onConflict: 'template_id,user_id,date', ignoreDuplicates: true })
    .select();

  if (error) throw new Error(error.message);
  return data;
}

export async function joinGroup(inviteCode: string, userId: string) {
  const supabase = await createClient();

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', inviteCode.toUpperCase())
    .single();

  if (groupError || !group) throw new Error('Invalid invite code');

  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId });

  if (error && !error.message.includes('duplicate')) throw new Error(error.message);

  return group;
}

export async function createGroup(name: string, userId: string) {
  const supabase = await createClient();

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('groups')
    .insert({ name, invite_code: inviteCode, created_by: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('group_members').insert({ group_id: data.id, user_id: userId });

  return data;
}

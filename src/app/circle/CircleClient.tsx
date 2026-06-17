'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Users, Trophy, Plus, Hash, Loader2, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { analytics } from '@/lib/analytics'

interface Group {
  id: string
  name: string
  invite_code: string
}

interface LeaderboardEntry {
  user_id: string
  name: string
  avatar_url: string | null
  weekly_hours: number
  current_streak: number
  score: number
}

interface Props {
  userId: string
  groups: Group[]
  activeGroup: Group | null
  initialLeaderboard: LeaderboardEntry[]
}

type Modal = 'none' | 'create' | 'join'

export default function CircleClient({ userId, groups, activeGroup, initialLeaderboard }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [modal, setModal] = useState<Modal>('none')
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: group, error: grpErr } = await supabase
      .from('groups')
      .insert({ name: groupName.trim(), invite_code: code, created_by: userId })
      .select()
      .single()
    if (grpErr) { setError(grpErr.message); setLoading(false); return }
    await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })
    analytics.track('group_joined', { groupId: group.id })
    setLoading(false)
    setModal('none')
    startTransition(() => router.refresh())
  }

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const code = inviteCode.trim().toUpperCase()
    const { data: group, error: grpErr } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', code)
      .single()
    if (grpErr || !group) { setError('Invalid invite code. Please check and try again.'); setLoading(false); return }
    const { error: joinErr } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: userId })
    if (joinErr && !joinErr.message.includes('duplicate')) {
      setError(joinErr.message); setLoading(false); return
    }
    analytics.track('group_joined', { groupId: group.id })
    setLoading(false)
    setModal('none')
    startTransition(() => router.refresh())
  }

  const copyCode = () => {
    if (!activeGroup) return
    navigator.clipboard.writeText(activeGroup.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getMedalColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400'
    if (rank === 1) return 'text-slate-300'
    if (rank === 2) return 'text-amber-600'
    return 'text-muted'
  }

  return (
    <div className="p-4 pt-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            {activeGroup ? activeGroup.name : 'Study Circle'}
          </h1>
          <p className="text-muted text-sm">
            {activeGroup ? 'Weekly Accountability Leaderboard' : 'Join or create a study circle'}
          </p>
        </div>
        {!activeGroup && (
          <div className="flex gap-2">
            <button
              onClick={() => { setModal('join'); setError(null) }}
              className="flex items-center gap-1.5 bg-card border border-border px-3 py-2 rounded-xl text-sm font-medium"
            >
              <Hash size={14} /> Join
            </button>
            <button
              onClick={() => { setModal('create'); setError(null) }}
              className="flex items-center gap-1.5 bg-white text-black px-3 py-2 rounded-xl text-sm font-bold"
            >
              <Plus size={14} /> Create
            </button>
          </div>
        )}
      </div>

      {/* No Group State */}
      {!activeGroup && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center mb-6">
            <Users size={36} className="text-muted" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Circle Yet</h2>
          <p className="text-muted text-sm max-w-[260px] mb-8">
            Create a circle with your friends or join one with an invite code.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { setModal('join'); setError(null) }}
              className="px-6 py-3 bg-card border border-border rounded-2xl font-semibold"
            >
              Join Circle
            </button>
            <button
              onClick={() => { setModal('create'); setError(null) }}
              className="px-6 py-3 bg-white text-black rounded-2xl font-bold"
            >
              Create Circle
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {activeGroup && (
        <>
          {/* Invite Code Card */}
          <div className="bg-card border border-border p-4 rounded-2xl mb-6 flex items-center justify-between">
            <div>
              <p className="text-muted text-xs font-medium mb-0.5">Invite Code</p>
              <p className="text-xl font-bold font-mono tracking-widest">{activeGroup.invite_code}</p>
            </div>
            <button onClick={copyCode} className="flex items-center gap-2 bg-border/50 px-3 py-2 rounded-xl text-sm font-medium">
              {copied ? <Check size={14} className="text-status-completed" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {initialLeaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <Trophy size={40} className="mx-auto mb-4 opacity-30" />
              <p className="font-medium">Leaderboard is empty</p>
              <p className="text-sm mt-1">Start studying to appear here!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {initialLeaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    entry.user_id === userId
                      ? 'bg-white/5 border-white/20'
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl font-bold w-6 text-center ${getMedalColor(index)}`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{entry.name}</span>
                        {entry.user_id === userId && (
                          <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full">You</span>
                        )}
                      </div>
                      <span className="text-muted text-sm flex items-center gap-1">
                        <Flame size={12} className="text-status-partial" />
                        {entry.current_streak} day streak
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-bold">{entry.weekly_hours}h</span>
                    <span className="text-muted text-xs">Score {Number(entry.score).toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal !== 'none' && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center" onClick={() => setModal('none')}>
          <div
            className="bg-card w-full max-w-[430px] rounded-t-[32px] p-6 border-t border-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-6 text-center">
              {modal === 'create' ? 'Create a Circle' : 'Join a Circle'}
            </h3>

            <form onSubmit={modal === 'create' ? handleCreateCircle : handleJoinCircle} className="flex flex-col gap-4">
              {modal === 'create' ? (
                <div>
                  <label className="text-sm text-muted font-medium mb-2 block">Circle Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Diploma Boys"
                    required
                    className="w-full bg-black border border-border rounded-2xl px-5 py-4 text-white placeholder:text-muted focus:outline-none focus:border-white/30"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm text-muted font-medium mb-2 block">Invite Code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="GRIND2026"
                    required
                    maxLength={8}
                    className="w-full bg-black border border-border rounded-2xl px-5 py-4 text-white placeholder:text-muted focus:outline-none focus:border-white/30 font-mono tracking-widest uppercase text-lg"
                  />
                </div>
              )}

              {error && <p className="text-status-missed text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
              >
                {loading && <Loader2 size={20} className="animate-spin" />}
                {modal === 'create' ? 'Create Circle' : 'Join Circle'}
              </button>
              <button type="button" onClick={() => setModal('none')} className="w-full py-3 text-muted text-sm">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

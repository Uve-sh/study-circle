'use client'

import { useState, useTransition } from 'react'
import { Flame, CheckCircle2, CircleDashed, Clock, XCircle, AlertCircle, LogOut } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Database, SessionStatus } from '@/lib/supabase/database.types'

type User = Database['public']['Tables']['users']['Row']
type Template = Database['public']['Tables']['session_templates']['Row']
type Log = Database['public']['Tables']['session_logs']['Row']

interface Props {
  profile: User
  templates: Template[]
  initialLogs: Log[]
  currentStreak: number
  userId: string
  today: string
}

export default function HomeClient({ profile, templates, initialLogs, currentStreak, userId, today }: Props) {
  const router = useRouter()
  const [logs, setLogs] = useState<Log[]>(initialLogs)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const missedCount = logs.filter(l => l.status === 'missed').length

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  const handleStatusUpdate = async (logId: string, status: SessionStatus) => {
    // Optimistic update
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, status } : l))
    setSelectedLog(null)
    analytics.track(`session_${status}` as any, { logId, userId })

    // Persist to Supabase
    const { error } = await supabase
      .from('session_logs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', logId)

    if (error) {
      console.error('Failed to update session:', error.message)
      // Revert optimistic update on error
      setLogs(initialLogs)
    } else {
      // Refresh streak data
      startTransition(() => router.refresh())
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const getStatusIcon = (status: SessionStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={24} className="text-status-completed" />
      case 'late': return <Clock size={24} className="text-status-late" />
      case 'partial': return <AlertCircle size={24} className="text-status-partial" />
      case 'missed': return <XCircle size={24} className="text-status-missed" />
      default: return <CircleDashed size={24} className="text-status-pending" />
    }
  }

  const getStatusColorClass = (status: SessionStatus) => {
    switch (status) {
      case 'completed': return 'border-status-completed bg-status-completed-bg'
      case 'late': return 'border-status-late bg-status-late-bg'
      case 'partial': return 'border-status-partial bg-status-partial-bg'
      case 'missed': return 'border-status-missed bg-status-missed-bg'
      default: return 'border-border bg-card'
    }
  }

  return (
    <div className="p-4 pt-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <button className="flex items-center gap-2 bg-card px-4 py-2 rounded-full border border-border">
          <span className="text-status-missed">⭕</span>
          <span className="font-bold text-lg">{missedCount}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full border border-border">
            <Flame size={20} className="text-status-partial" fill="currentColor" />
            <span className="font-bold text-lg">{currentStreak}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center bg-card rounded-full border border-border"
            title="Sign out"
          >
            <LogOut size={16} className="text-muted" />
          </button>
        </div>
      </div>

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-1 tracking-tight">Assalamu Alaikum,</h1>
        <h2 className="text-2xl text-muted font-semibold">{profile.name}</h2>
      </div>

      {/* Today's Date */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold">Today</h3>
        <p className="text-muted text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="text-center py-16 text-muted">
          <p className="text-lg font-medium">No sessions configured yet.</p>
          <p className="text-sm mt-1">Go to Schedule → Settings to add sessions.</p>
        </div>
      )}

      {/* Sessions Grid */}
      <div className="flex flex-col gap-4">
        {templates.map(template => {
          const log = logs.find(l => l.template_id === template.id)
          const status = log?.status ?? 'pending'

          return (
            <button
              key={template.id}
              onClick={() => log && setSelectedLog(log)}
              className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-200 active:scale-[0.98] ${getStatusColorClass(status)}`}
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-xl font-semibold mb-1">{template.name}</span>
                <span className="text-2xl font-bold text-foreground mb-1">{template.duration_minutes}m</span>
                <span className="text-muted text-sm font-medium">{formatTime(template.start_time)}</span>
              </div>
              <div className="flex items-center justify-center bg-black/40 p-3 rounded-full">
                {getStatusIcon(status)}
              </div>
            </button>
          )
        })}
      </div>

      {/* Status Update Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-card w-full max-w-[430px] rounded-t-[32px] p-6 border-t border-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-2 text-center">Update Session</h3>
            <p className="text-muted text-sm text-center mb-6">
              {templates.find(t => t.id === selectedLog.template_id)?.name}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleStatusUpdate(selectedLog.id, 'completed')}
                className="w-full py-4 bg-status-completed-bg text-status-completed font-semibold text-lg rounded-2xl border border-status-completed"
              >
                ✓ Completed (On Time)
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedLog.id, 'late')}
                className="w-full py-4 bg-status-late-bg text-status-late font-semibold text-lg rounded-2xl border border-status-late"
              >
                🕐 Completed (Late)
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedLog.id, 'partial')}
                className="w-full py-4 bg-status-partial-bg text-status-partial font-semibold text-lg rounded-2xl border border-status-partial"
              >
                ◑ Partial Progress
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedLog.id, 'missed')}
                className="w-full py-4 bg-status-missed-bg text-status-missed font-semibold text-lg rounded-2xl border border-status-missed"
              >
                ✕ Missed
              </button>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-4 bg-border/50 text-white font-semibold text-lg rounded-2xl mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

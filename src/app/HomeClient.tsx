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

  const [notes, setNotes] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDuration, setEditDuration] = useState('')

  const openSessionModal = (template: Template, log?: Log) => {
    setSelectedLog(log || null)
    setEditName(template.name)
    setEditDuration(template.duration_minutes.toString())
    setNotes(log?.notes || '')
    setIsEditing(false)
  }

  const handleStatusUpdate = async (logId: string, status: SessionStatus) => {
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, status, notes } : l))
    setSelectedLog(null)
    analytics.track(`session_${status}` as any, { logId, userId })

    const { error } = await supabase
      .from('session_logs')
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq('id', logId)

    if (!error) startTransition(() => router.refresh())
  }

  const handleSaveNotes = async (logId: string) => {
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, notes } : l))
    await supabase.from('session_logs').update({ notes }).eq('id', logId)
  }

  const handleStartTimer = async (template: Template) => {
    await supabase.from('active_timers').upsert({
      user_id: userId,
      template_id: template.id,
      status: 'running',
      start_time: new Date().toISOString(),
      accumulated_seconds: 0,
      mode: 'countdown',
      duration_minutes: template.duration_minutes
    })
    setSelectedLog(null)
  }

  const handleSaveEdit = async (templateId: string) => {
    await supabase.from('session_templates').update({
      name: editName,
      duration_minutes: parseInt(editDuration)
    }).eq('id', templateId)
    
    setIsEditing(false)
    startTransition(() => router.refresh())
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Delete this session?')) return;
    await supabase.from('session_templates').delete().eq('id', templateId)
    setSelectedLog(null)
    startTransition(() => router.refresh())
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
      default: return 'border-border hover:border-white/20 bg-card'
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
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold mb-1 tracking-tight">Assalamu Alaikum,</h1>
          <h2 className="text-2xl text-muted font-semibold">{profile.name}</h2>
        </div>
      </div>

      {/* Today's Date */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Today</h3>
          <p className="text-muted text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button 
          onClick={() => router.push('/schedule')}
          className="px-4 py-2 bg-white text-black rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors"
        >
          + Add Session
        </button>
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="text-center py-16 text-muted border border-border border-dashed rounded-2xl">
          <p className="text-lg font-medium">No sessions configured yet.</p>
          <p className="text-sm mt-1">Tap Add Session to get started.</p>
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
              onClick={() => openSessionModal(template, log)}
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

      {/* Session Details Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-card w-full max-w-[430px] rounded-t-[32px] p-6 border-t border-border flex flex-col max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
            
            {/* Modal Header */}
            {isEditing ? (
              <div className="flex flex-col gap-3 mb-6">
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  className="w-full bg-black border border-border rounded-xl p-3 font-bold text-lg focus:border-white/40 outline-none"
                  placeholder="Subject Name"
                />
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={editDuration} 
                    onChange={e => setEditDuration(e.target.value)} 
                    className="w-full bg-black border border-border rounded-xl p-3 focus:border-white/40 outline-none"
                    placeholder="Duration (min)"
                  />
                  <button onClick={() => handleSaveEdit(selectedLog.template_id)} className="bg-white text-black px-4 rounded-xl font-bold">Save</button>
                  <button onClick={() => setIsEditing(false)} className="bg-border px-4 rounded-xl font-bold">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{templates.find(t => t.id === selectedLog.template_id)?.name}</h3>
                  <p className="text-muted text-sm font-medium">
                    {templates.find(t => t.id === selectedLog.template_id)?.duration_minutes} minutes
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(true)} className="p-2 bg-black/40 rounded-full text-muted hover:text-white">Edit</button>
                  <button onClick={() => handleDelete(selectedLog.template_id)} className="p-2 bg-black/40 rounded-full text-muted hover:text-status-missed">Delete</button>
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="mb-6">
              <label className="text-sm font-bold text-muted mb-2 block">Session Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={() => handleSaveNotes(selectedLog.id)}
                placeholder="What did you focus on?"
                className="w-full bg-black border border-border rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:border-white/40 transition-colors resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleStartTimer(templates.find(t => t.id === selectedLog.template_id)!)}
                className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-2"
              >
                ▶ Start Focus Timer
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleStatusUpdate(selectedLog.id, 'completed')}
                  className={`py-3 font-semibold rounded-xl border ${selectedLog.status === 'completed' ? 'bg-status-completed text-black border-status-completed' : 'bg-status-completed-bg text-status-completed border-status-completed/30'}`}
                >
                  ✓ Complete
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedLog.id, 'partial')}
                  className={`py-3 font-semibold rounded-xl border ${selectedLog.status === 'partial' ? 'bg-status-partial text-black border-status-partial' : 'bg-status-partial-bg text-status-partial border-status-partial/30'}`}
                >
                  ◑ Partial
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedLog.id, 'late')}
                  className={`py-3 font-semibold rounded-xl border ${selectedLog.status === 'late' ? 'bg-status-late text-black border-status-late' : 'bg-status-late-bg text-status-late border-status-late/30'}`}
                >
                  🕐 Late
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedLog.id, 'missed')}
                  className={`py-3 font-semibold rounded-xl border ${selectedLog.status === 'missed' ? 'bg-status-missed text-black border-status-missed' : 'bg-status-missed-bg text-status-missed border-status-missed/30'}`}
                >
                  ✕ Missed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

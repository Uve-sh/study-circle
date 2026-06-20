'use client'

import { useState, useTransition } from 'react'
import { Clock, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/supabase/database.types'

type Template = Database['public']['Tables']['session_templates']['Row']

export default function ScheduleClient({ initialTemplates, userId }: { initialTemplates: Template[], userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [isPending, startTransition] = useTransition()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  
  // Form State
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState('60')
  const [loading, setLoading] = useState(false)

  const openModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template)
      setName(template.name)
      // Ensure start_time is just HH:mm
      setStartTime(template.start_time.substring(0, 5))
      setDuration(template.duration_minutes.toString())
    } else {
      setEditingTemplate(null)
      setName('')
      setStartTime('09:00')
      setDuration('60')
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTemplate(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Sort logic placeholder (append to end)
    const orderIndex = editingTemplate ? editingTemplate.order_index : templates.length

    if (editingTemplate) {
      // Update
      const { data, error } = await supabase
        .from('session_templates')
        .update({
          name,
          start_time: startTime + ':00',
          duration_minutes: parseInt(duration),
        })
        .eq('id', editingTemplate.id)
        .select()
        .single()
        
      if (!error && data) {
        setTemplates(prev => prev.map(t => t.id === data.id ? data : t).sort((a,b) => a.start_time.localeCompare(b.start_time)))
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('session_templates')
        .insert({
          user_id: userId,
          name,
          start_time: startTime + ':00',
          duration_minutes: parseInt(duration),
          order_index: orderIndex,
        })
        .select()
        .single()
        
      if (!error && data) {
        setTemplates(prev => [...prev, data].sort((a,b) => a.start_time.localeCompare(b.start_time)))
      }
    }
    
    setLoading(false)
    closeModal()
    startTransition(() => router.refresh())
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    // Optimistic delete
    setTemplates(prev => prev.filter(t => t.id !== id))
    
    const { error } = await supabase.from('session_templates').delete().eq('id', id)
    if (error) {
      // Rollback on error
      setTemplates(initialTemplates)
    } else {
      startTransition(() => router.refresh())
    }
  }

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  return (
    <div className="p-4 pt-8 pb-32">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Schedule</h1>
          <p className="text-muted text-sm">Your daily session timeline</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <Clock size={40} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No sessions configured</p>
          <p className="text-sm mt-1">Tap the plus button to add your first study session.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 relative">
          {/* Timeline Line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-border z-0" />

          {templates.map((template) => {
            const [h, m] = template.start_time.split(':').map(Number)
            const sessionStart = h * 60 + m
            const sessionEnd = sessionStart + template.duration_minutes
            const isActive = nowMinutes >= sessionStart && nowMinutes < sessionEnd
            const isPast = nowMinutes >= sessionEnd

            return (
              <div key={template.id} className="relative z-10 flex items-start gap-4">
                <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center shrink-0 bg-card ${
                  isActive ? 'border-status-completed' :
                  isPast ? 'border-border' :
                  'border-white/20'
                }`}>
                  <Clock size={20} className={isActive ? 'text-status-completed' : 'text-muted'} />
                </div>
                
                <div className={`flex-1 p-5 rounded-2xl mt-1 border transition-all duration-200 group ${
                  isActive ? 'bg-status-completed-bg border-status-completed' :
                  isPast ? 'bg-card border-border opacity-60' :
                  'bg-card border-border hover:border-white/20'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold mb-0.5">{template.name}</h3>
                      <p className="text-muted text-sm">
                        {formatTime(template.start_time)} — {template.duration_minutes}m
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(template)} className="p-2 bg-black/40 rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(template.id)} className="p-2 bg-black/40 rounded-full hover:bg-status-missed/20 text-muted hover:text-status-missed transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {isActive && (
                    <div className="inline-block bg-status-completed-bg border border-status-completed text-status-completed text-xs font-bold px-3 py-1 rounded-full mt-1">
                      Active Now
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-[360px] rounded-[32px] p-6 border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">{editingTemplate ? 'Edit Session' : 'New Session'}</h3>
              <button onClick={closeModal} className="text-muted hover:text-white transition-colors p-2 bg-black/40 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-muted font-medium mb-2 block">Subject / Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Math Chapter 3"
                  className="w-full bg-black border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm text-muted font-medium mb-2 block">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-black border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-muted font-medium mb-2 block">Duration (min)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="480"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full bg-black border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl mt-4 flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading && <Loader2 size={20} className="animate-spin" />}
                {editingTemplate ? 'Save Changes' : 'Create Session'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

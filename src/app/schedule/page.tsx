import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Clock } from 'lucide-react'

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default async function Schedule() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: templates } = await supabase
    .from('session_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('order_index', { ascending: true })

  const sessions = templates ?? []
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  return (
    <div className="p-4 pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Schedule</h1>
        <p className="text-muted text-sm">Your daily session timeline</p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <Clock size={40} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No sessions configured</p>
          <p className="text-sm mt-1">Sessions will appear here after you set them up.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 relative">
          {/* Timeline Line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-border z-0" />

          {sessions.map((template) => {
            const [h, m] = template.start_time.split(':').map(Number)
            const sessionStart = h * 60 + m
            const sessionEnd = sessionStart + template.duration_minutes
            const isActive = nowMinutes >= sessionStart && nowMinutes < sessionEnd
            const isPast = nowMinutes >= sessionEnd
            const remaining = sessionEnd - nowMinutes

            return (
              <div key={template.id} className="relative z-10 flex items-start gap-4">
                <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-status-completed-bg border-status-completed' :
                  isPast ? 'bg-card border-border' :
                  'bg-card border-black'
                }`}>
                  <Clock size={20} className={isActive ? 'text-status-completed' : 'text-muted'} />
                </div>
                <div className={`flex-1 p-5 rounded-2xl mt-1 border ${
                  isActive ? 'bg-status-completed-bg border-status-completed' :
                  isPast ? 'bg-card border-border opacity-60' :
                  'bg-card border-border'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold mb-0.5">{template.name}</h3>
                      <p className="text-muted text-sm">
                        {formatTime(template.start_time)} — {template.duration_minutes}m
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-status-completed text-xs font-bold bg-status-completed-bg px-3 py-1 rounded-full border border-status-completed">
                        {remaining}m left
                      </span>
                    )}
                    {isPast && (
                      <span className="text-muted text-xs font-medium">Done</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

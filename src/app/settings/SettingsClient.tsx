'use client'

import { useState, useTransition } from 'react'
import { Bell, Clock, Database, Moon, Sun, Download, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/supabase/database.types'

type UserSettings = Database['public']['Tables']['user_settings']['Row']

export default function SettingsClient({ 
  initialSettings, 
  userId 
}: { 
  initialSettings: UserSettings | null, 
  userId: string 
}) {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  
  const [settings, setSettings] = useState<UserSettings | null>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Handlers for immediate toggles
  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!settings) return;
    
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    
    setSaving(true)
    const { error } = await supabase
      .from('user_settings')
      .update({ [key]: value })
      .eq('user_id', userId)
      
    setSaving(false)
    if (!error) {
      startTransition(() => router.refresh())
    } else {
      setSettings(settings) // rollback
    }
  }

  const handleExport = async () => {
    setExporting(true)
    
    try {
      // Fetch data
      const [logsRes, templatesRes] = await Promise.all([
        supabase.from('session_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('session_templates').select('*').eq('user_id', userId)
      ])
      
      const logs = logsRes.data || []
      const templates = templatesRes.data || []
      
      // Create CSV
      const headers = ['Date', 'Session Name', 'Target Duration (min)', 'Actual Completed (min)', 'Status']
      const rows = logs.map(log => {
        const template = templates.find(t => t.id === log.template_id)
        return [
          log.date,
          `"${template?.name || 'Unknown'}"`,
          template?.duration_minutes || 0,
          log.actual_minutes_completed || 0,
          log.status
        ].join(',')
      })
      
      const csvContent = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `study_circle_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (e) {
      console.error('Export failed', e)
    } finally {
      setExporting(false)
    }
  }

  if (!settings) {
    return (
      <div className="p-4 pt-8 text-center text-muted">
        <Loader2 className="animate-spin mx-auto mb-4" />
        <p>Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="p-4 pt-8 pb-32">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-muted text-sm">Manage your preferences</p>
        </div>
        {saving && <Loader2 size={20} className="text-muted animate-spin mt-2" />}
      </div>

      <div className="flex flex-col gap-6">
        
        {/* Session Configuration */}
        <section>
          <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
            <Clock size={16} /> Timer & Sessions
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <span className="font-medium">Focus Duration (min)</span>
              <input 
                type="number" 
                value={settings.default_focus_duration} 
                onChange={(e) => updateSetting('default_focus_duration', parseInt(e.target.value))}
                className="w-20 bg-black border border-border rounded-lg px-3 py-1 text-center focus:outline-none focus:border-white/40"
              />
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium">Break Duration (min)</span>
              <input 
                type="number" 
                value={settings.default_break_duration} 
                onChange={(e) => updateSetting('default_break_duration', parseInt(e.target.value))}
                className="w-20 bg-black border border-border rounded-lg px-3 py-1 text-center focus:outline-none focus:border-white/40"
              />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
            <Bell size={16} /> Notifications
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <button 
              onClick={() => updateSetting('notifications_enabled', !settings.notifications_enabled)}
              className="p-4 border-b border-border flex justify-between items-center hover:bg-white/5"
            >
              <span className="font-medium">Push Notifications</span>
              <div className={`w-12 h-6 rounded-full transition-colors relative ${settings.notifications_enabled ? 'bg-status-completed' : 'bg-border'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.notifications_enabled ? 'left-7' : 'left-1'}`} />
              </div>
            </button>
            <button 
              onClick={() => updateSetting('study_reminders_enabled', !settings.study_reminders_enabled)}
              className="p-4 flex justify-between items-center hover:bg-white/5"
            >
              <span className="font-medium">Study Reminders</span>
              <div className={`w-12 h-6 rounded-full transition-colors relative ${settings.study_reminders_enabled ? 'bg-status-completed' : 'bg-border'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.study_reminders_enabled ? 'left-7' : 'left-1'}`} />
              </div>
            </button>
          </div>
        </section>

        {/* Theme Preferences */}
        <section>
          <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
            <Moon size={16} /> Appearance
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium">Theme</span>
              <div className="flex bg-black rounded-xl p-1 border border-border">
                <button 
                  onClick={() => updateSetting('theme', 'dark')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${settings.theme === 'dark' ? 'bg-border text-white' : 'text-muted hover:text-white'}`}
                >
                  Dark
                </button>
                <button 
                  onClick={() => updateSetting('theme', 'light')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${settings.theme === 'light' ? 'bg-border text-white' : 'text-muted hover:text-white'}`}
                >
                  Light
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Data Export */}
        <section>
          <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
            <Database size={16} /> Data Management
          </h2>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-card border border-border rounded-2xl p-4 flex justify-between items-center hover:border-white/20 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <div className="flex flex-col text-left">
              <span className="font-medium">Export Session History</span>
              <span className="text-muted text-xs">Download all data as CSV</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
              {exporting ? <Loader2 size={16} className="animate-spin text-muted" /> : <Download size={16} className="text-white" />}
            </div>
          </button>
        </section>

      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, ChevronUp, ChevronDown, Clock, Loader2, Maximize2, Minimize2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'
import type { Database } from '@/lib/supabase/database.types'

type ActiveTimer = Database['public']['Tables']['active_timers']['Row']

export default function FocusTimer({ userId }: { userId: string | null }) {
  const supabase = createClient()
  const pathname = usePathname()
  
  const [timer, setTimer] = useState<ActiveTimer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Display states
  const [displaySeconds, setDisplaySeconds] = useState(0)
  
  // Do not render on auth pages
  const isAuthPage = pathname?.startsWith('/auth')
  
  const fetchTimer = async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    
    const { data, error } = await supabase
      .from('active_timers')
      .select('*')
      .eq('user_id', userId)
      .single()
      
    if (data) {
      setTimer(data)
    } else {
      setTimer(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTimer()
  }, [userId])
  
  // Real-time synchronization for multiple tabs
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel('public:active_timers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_timers', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setTimer(null);
          } else {
            setTimer(payload.new as ActiveTimer);
          }
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Timer Tick Logic based on Server Timestamps
  useEffect(() => {
    if (!timer) return;
    
    const updateDisplay = () => {
      let elapsed = timer.accumulated_seconds;
      
      if (timer.status === 'running') {
        const start = new Date(timer.start_time).getTime();
        const now = Date.now();
        elapsed += Math.floor((now - start) / 1000);
      }
      
      if (timer.mode === 'countdown' && timer.duration_minutes) {
        const remaining = Math.max(0, (timer.duration_minutes * 60) - elapsed);
        setDisplaySeconds(remaining);
      } else {
        setDisplaySeconds(elapsed);
      }
    };
    
    updateDisplay(); // immediate update
    const intervalId = setInterval(updateDisplay, 1000);
    return () => clearInterval(intervalId);
  }, [timer])

  // Actions
  const handleStart = async () => {
    if (!userId) return;
    
    if (!timer) {
      // Create new default timer (25 mins) if none exists
      const { data } = await supabase
        .from('active_timers')
        .insert({
          user_id: userId,
          status: 'running',
          start_time: new Date().toISOString(),
          accumulated_seconds: 0,
          mode: 'countdown',
          duration_minutes: 25,
        })
        .select()
        .single()
        
      if (data) setTimer(data)
    } else if (timer.status === 'paused') {
      // Resume
      const { data } = await supabase
        .from('active_timers')
        .update({
          status: 'running',
          start_time: new Date().toISOString(),
          last_paused_at: null
        })
        .eq('user_id', userId)
        .select()
        .single()
        
      if (data) setTimer(data)
    }
  }

  const handlePause = async () => {
    if (!userId || !timer || timer.status === 'paused') return;
    
    // Calculate new accumulated time
    const start = new Date(timer.start_time).getTime();
    const now = Date.now();
    const newAccumulated = timer.accumulated_seconds + Math.floor((now - start) / 1000);
    
    const { data } = await supabase
      .from('active_timers')
      .update({
        status: 'paused',
        last_paused_at: new Date().toISOString(),
        accumulated_seconds: newAccumulated
      })
      .eq('user_id', userId)
      .select()
      .single()
      
    if (data) setTimer(data)
  }

  const handleStop = async () => {
    if (!userId || !timer) return;
    
    // Calculate final time
    let finalElapsed = timer.accumulated_seconds;
    if (timer.status === 'running') {
      const start = new Date(timer.start_time).getTime();
      const now = Date.now();
      finalElapsed += Math.floor((now - start) / 1000);
    }
    
    const minutesCompleted = Math.floor(finalElapsed / 60);

    // Save actual progress to session_logs if associated with a template
    if (timer.template_id) {
      const today = new Date().toISOString().split('T')[0];
      
      let statusUpdate: 'partial' | 'completed' = 'partial';
      if (timer.duration_minutes && minutesCompleted >= timer.duration_minutes * 0.9) {
        statusUpdate = 'completed';
      }

      await supabase.from('session_logs')
        .update({
          actual_minutes_completed: minutesCompleted,
          status: statusUpdate,
          updated_at: new Date().toISOString()
        })
        .eq('template_id', timer.template_id)
        .eq('user_id', userId)
        .eq('date', today);
    }
    
    // Reset the active timer
    await supabase.from('active_timers').delete().eq('user_id', userId);
    setTimer(null);
    setIsExpanded(false);
  }

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (isAuthPage || loading || !userId) return null;

  return (
    <div className={`fixed z-50 transition-all duration-300 ease-in-out ${
      isExpanded 
        ? 'inset-0 bg-black/90 flex flex-col items-center justify-center p-6' 
        : 'bottom-[96px] right-4'
    }`}>
      {/* Minimized Pill View */}
      {!isExpanded && (
        <div className="bg-card border border-border shadow-2xl rounded-full p-2 pr-4 flex items-center gap-3 backdrop-blur-xl bg-card/90">
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Clock size={20} className="text-white" />
          </button>
          
          <div className="flex flex-col mr-2 min-w-[50px]">
            <span className="text-sm font-bold leading-tight font-mono">
              {timer ? formatTime(displaySeconds) : '25:00'}
            </span>
            <span className="text-[10px] text-muted leading-tight">Focus</span>
          </div>
          
          <div className="flex items-center gap-1 border-l border-border pl-3">
            {(!timer || timer.status === 'paused') ? (
              <button onClick={handleStart} className="w-8 h-8 rounded-full bg-status-completed-bg text-status-completed flex items-center justify-center hover:opacity-80">
                <Play size={14} className="ml-0.5" fill="currentColor" />
              </button>
            ) : (
              <button onClick={handlePause} className="w-8 h-8 rounded-full bg-status-partial-bg text-status-partial flex items-center justify-center hover:opacity-80">
                <Pause size={14} fill="currentColor" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expanded Modal View */}
      {isExpanded && (
        <div className="w-full max-w-[340px] bg-card border border-border rounded-[32px] p-8 flex flex-col items-center relative animate-in fade-in zoom-in-95 duration-200">
          <button 
            onClick={() => setIsExpanded(false)}
            className="absolute top-6 right-6 text-muted hover:text-white transition-colors"
          >
            <Minimize2 size={20} />
          </button>

          <div className="mb-8 mt-2 flex gap-2 p-1 bg-black rounded-full border border-border">
            <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-white text-black">
              Pomodoro
            </button>
            <button className="px-4 py-1.5 rounded-full text-sm font-medium text-muted hover:text-white">
              Stopwatch
            </button>
          </div>

          <div className="relative w-64 h-64 flex items-center justify-center mb-10">
            {/* SVG Progress Circle placeholder */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle cx="128" cy="128" r="120" stroke="var(--color-border)" strokeWidth="6" fill="none" />
              <circle 
                cx="128" cy="128" r="120" 
                stroke="var(--color-status-completed)" 
                strokeWidth="6" fill="none" 
                strokeLinecap="round"
                strokeDasharray="753.6"
                strokeDashoffset={timer && timer.duration_minutes ? 753.6 * (1 - displaySeconds / (timer.duration_minutes * 60)) : 0}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="flex flex-col items-center z-10">
              <Clock size={24} className="text-status-completed mb-2 opacity-80" />
              <span className="text-6xl font-bold font-mono tracking-tighter mb-1">
                {timer ? formatTime(displaySeconds) : '25:00'}
              </span>
              <span className="text-sm font-medium text-muted bg-black px-3 py-1 rounded-full border border-border mt-2">
                Stay focused ✨
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={handleStop} className="w-14 h-14 rounded-full bg-black border border-border flex items-center justify-center text-muted hover:text-white hover:border-white/20 transition-all">
              <Square size={20} fill="currentColor" />
            </button>
            
            {(!timer || timer.status === 'paused') ? (
              <button onClick={handleStart} className="w-20 h-20 rounded-full bg-status-completed text-black flex items-center justify-center shadow-[0_0_40px_rgba(74,222,128,0.3)] hover:scale-105 transition-all">
                <Play size={32} className="ml-2" fill="currentColor" />
              </button>
            ) : (
              <button onClick={handlePause} className="w-20 h-20 rounded-full bg-status-partial text-black flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.3)] hover:scale-105 transition-all">
                <Pause size={32} fill="currentColor" />
              </button>
            )}
            
            <button className="w-14 h-14 rounded-full bg-black border border-border flex items-center justify-center text-muted hover:text-white hover:border-white/20 transition-all">
              <span className="font-bold">↻</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

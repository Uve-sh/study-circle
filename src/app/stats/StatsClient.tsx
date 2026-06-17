'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Flame, Clock, CheckCircle2, XCircle } from 'lucide-react'

interface LogEntry {
  date: string
  status: string
  actual_minutes_completed: number | null
  template_id: string
}

interface Props {
  currentStreak: number
  logs: LogEntry[]
  totalDone: number
  weeklyHours: number
}

const STATUS_COLORS = {
  completed: '#4ade80',
  late: '#60a5fa',
  partial: '#facc15',
  missed: '#f87171',
  pending: '#4b5563',
}

function getCalendarColor(dayLogs: LogEntry[]): string {
  if (dayLogs.length === 0) return 'bg-border/30'
  if (dayLogs.every(l => l.status === 'completed')) return 'bg-status-completed'
  if (dayLogs.every(l => l.status === 'completed' || l.status === 'late')) return 'bg-status-late'
  if (dayLogs.some(l => l.status === 'missed')) return 'bg-status-missed'
  if (dayLogs.some(l => l.status === 'partial')) return 'bg-status-partial'
  return 'bg-border/30'
}

export default function StatsClient({ currentStreak, logs, totalDone, weeklyHours }: Props) {
  const completedCount = logs.filter(l => l.status === 'completed' || l.status === 'late').length
  const partialCount = logs.filter(l => l.status === 'partial').length
  const missedCount = logs.filter(l => l.status === 'missed').length
  const total = completedCount + partialCount + missedCount

  const chartData = [
    { name: 'Completed', value: completedCount, color: '#4ade80' },
    { name: 'Partial', value: partialCount, color: '#facc15' },
    { name: 'Missed', value: missedCount, color: '#f87171' },
  ].filter(d => d.value > 0)

  // Build calendar — last 30 days
  const logsByDate: Record<string, LogEntry[]> = {}
  logs.forEach(l => {
    if (!logsByDate[l.date]) logsByDate[l.date] = []
    logsByDate[l.date].push(l)
  })

  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const dateStr = d.toISOString().split('T')[0]
    return { dateStr, dayLogs: logsByDate[dateStr] ?? [], label: d.getDate().toString() }
  })

  return (
    <div className="p-4 pt-8 pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Statistics</h1>
        <p className="text-muted text-sm">Your performance overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col items-center text-center">
          <Flame size={20} className="text-status-partial mb-2" fill="currentColor" />
          <span className="text-4xl font-bold">{currentStreak}</span>
          <span className="text-muted text-xs font-medium mt-1">Day Streak</span>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col items-center text-center">
          <CheckCircle2 size={20} className="text-status-completed mb-2" />
          <span className="text-4xl font-bold">{totalDone}</span>
          <span className="text-muted text-xs font-medium mt-1">Sessions Done</span>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col items-center text-center">
          <Clock size={20} className="text-status-late mb-2" />
          <span className="text-4xl font-bold">{weeklyHours}h</span>
          <span className="text-muted text-xs font-medium mt-1">This Week</span>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col items-center text-center">
          <XCircle size={20} className="text-status-missed mb-2" />
          <span className="text-4xl font-bold">{missedCount}</span>
          <span className="text-muted text-xs font-medium mt-1">Missed (30d)</span>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="bg-card border border-border p-5 rounded-2xl mb-5">
        <h3 className="text-lg font-semibold mb-1">Completion Rate</h3>
        <p className="text-muted text-xs mb-4">Last 30 days</p>
        {total === 0 ? (
          <div className="text-center py-8 text-muted text-sm">No session data yet</div>
        ) : (
          <div className="flex items-center gap-4">
            <div style={{ height: 160, width: 160, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70}
                    paddingAngle={3} dataKey="value" stroke="none">
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '8px', fontSize: 12 }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {chartData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{Math.round((item.value / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-card border border-border p-5 rounded-2xl">
        <h3 className="text-lg font-semibold mb-4">30-Day History</h3>
        <div className="grid grid-cols-10 gap-1.5">
          {calendarDays.map(({ dateStr, dayLogs, label }) => (
            <div
              key={dateStr}
              className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium ${getCalendarColor(dayLogs)}`}
              title={dateStr}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {[
            { color: 'bg-status-completed', label: 'All done' },
            { color: 'bg-status-late', label: 'Late' },
            { color: 'bg-status-partial', label: 'Partial' },
            { color: 'bg-status-missed', label: 'Missed' },
            { color: 'bg-border/30', label: 'No data' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${item.color}`} />
              <span className="text-muted text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

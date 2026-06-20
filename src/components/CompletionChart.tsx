'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  chartData: { name: string; value: number; color: string }[]
  total: number
}

export default function CompletionChart({ chartData, total }: Props) {
  return (
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
  )
}

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface DataPoint { year: number; thickness: number }

interface Props {
  data: DataPoint[]
  retirementThickness: number
  height?: number
}

export function ThicknessChart({ data, retirementThickness, height = 200 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
        <XAxis
          dataKey="year"
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={{ stroke: '#1e2530' }}
          tickLine={false}
        />
        <YAxis
          domain={[4, 14]}
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={{ stroke: '#1e2530' }}
          tickLine={false}
          tickFormatter={(v) => `${v}`}
          label={{ value: 'Thickness (mm)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 9, dx: 8 }}
        />
        <Tooltip
          contentStyle={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 6, fontSize: 11 }}
          labelStyle={{ color: '#94a3b8' }}
          itemStyle={{ color: '#60a5fa' }}
          formatter={(v: number) => [`${v} mm`, 'Avg Measured']}
        />
        <ReferenceLine
          y={retirementThickness}
          stroke="#ef4444"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          label={{ value: `Min Required: ${retirementThickness} mm`, fill: '#ef4444', fontSize: 9, position: 'insideTopRight' }}
        />
        <Line
          type="monotone"
          dataKey="thickness"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#60a5fa' }}
          name="Avg Measured Thickness"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// Standardized colors for consistent UI across the dashboard
const COMPONENT_COLORS: Record<string, string> = {
  SHELL: '#3b82f6',      // Blue
  FLOOR: '#10b981',      // Emerald/Green
  ROOF: '#8b5cf6',       // Purple/Violet
  NOZZLE: '#f59e0b',     // Amber/Orange
  FOUNDATION: '#64748b', // Slate/Gray
};

export interface DataPoint {
  year: number;
  // Dynamic keys for components (e.g., { year: 2021, SHELL: 12.1, FLOOR: 6.2 })
  [key: string]: number; 
}

export interface Props {
  data: DataPoint[];
  // Map of component name to its specific retirement thickness (mm)
  retirementLimits?: Record<string, number>;
  // Array of components to display (e.g., ['SHELL', 'FLOOR'])
  activeComponents?: string[];
  height?: number;
}

export function ThicknessChart({ 
  data, 
  retirementLimits = {}, 
  activeComponents = ['SHELL'], 
  height = 240 
}: Props) {
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
        {/* Dark theme grid matching the TIMS aesthetic */}
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" vertical={false} />
        
        <XAxis
          dataKey="year"
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={{ stroke: '#1e2530' }}
          tickLine={false}
          dy={10}
        />
        
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={{ stroke: '#1e2530' }}
          tickLine={false}
          tickFormatter={(v) => `${v}mm`}
        />

        <Tooltip
          contentStyle={{ 
            background: '#0d1117', 
            border: '1px solid #1e2530', 
            borderRadius: 6, 
            fontSize: 11,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)' 
          }}
          labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: 4 }}
          itemStyle={{ padding: '2px 0' }}
          // FIXED: Receives name payload to correctly identify what component row is hovered
          formatter={(value: any, name: string) => [
            <span className="font-semibold text-slate-200">{Number(value).toFixed(2)} mm</span>, 
            <span className="text-slate-400 capitalize">{name.toLowerCase()}</span>
          ]}
        />

        <Legend 
          verticalAlign="top" 
          align="right"
          height={32}
          iconType="circle"
          wrapperStyle={{ fontSize: 10, color: '#94a3b8', textTransform: 'capitalize' }}
        />

        {/* Render component-specific Retirement Lines */}
        {activeComponents.map(comp => (
          retirementLimits[comp] !== undefined && retirementLimits[comp] !== 0 && (
            <ReferenceLine
              key={`ref-${comp}`}
              y={retirementLimits[comp]}
              stroke={COMPONENT_COLORS[comp] || '#ef4444'}
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.7}
              label={{ 
                value: `${comp.toLowerCase()} limit`, 
                fill: COMPONENT_COLORS[comp] || '#ef4444', 
                fontSize: 8, 
                position: 'insideBottomRight',
                offset: 5
              }}
            />
          )
        ))}

        {/* Render dynamic Lines for each active component */}
        {activeComponents.map(comp => (
          <Line
            key={comp}
            type="monotone"
            dataKey={comp}
            stroke={COMPONENT_COLORS[comp] || '#3b82f6'}
            strokeWidth={2}
            dot={{ fill: COMPONENT_COLORS[comp] || '#3b82f6', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            name={comp}
            connectNulls // Essential if some years only have data for specific parts
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
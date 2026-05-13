interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  valueColor?: string
}

export function StatCard({ label, value, sub, valueColor = 'text-slate-100' }: StatCardProps) {
  return (
    <div className="bg-[#0d1117] border border-[#1e2530] rounded-lg px-4 py-3">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-[11px] text-green-400 mt-1">{sub}</p>}
    </div>
  )
}

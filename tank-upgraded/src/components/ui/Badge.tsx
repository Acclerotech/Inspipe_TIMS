type Variant =
  | 'high' | 'medium' | 'low'
  | 'good' | 'monitor' | 'action'
  | 'compliant' | 'planned' | 'info' | 'closed'

const styles: Record<Variant, string> = {
  high:      'bg-red-950 text-red-400 border-red-900',
  medium:    'bg-orange-950 text-orange-400 border-orange-900',
  low:       'bg-green-950 text-green-400 border-green-900',
  good:      'bg-green-950 text-green-400 border-green-900',
  monitor:   'bg-orange-950 text-orange-400 border-orange-900',
  action:    'bg-red-950 text-red-400 border-red-900',
  compliant: 'bg-blue-950 text-blue-400 border-blue-900',
  planned:   'bg-slate-800 text-slate-400 border-slate-700',
  info:      'bg-blue-950 text-blue-400 border-blue-900',
  closed:    'bg-slate-800 text-slate-500 border-slate-700',
}

interface BadgeProps {
  variant: Variant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}

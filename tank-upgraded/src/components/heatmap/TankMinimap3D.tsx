// components/heatmap/TankMinimap3D.tsx
import type { Defect } from '../../types/api';

interface Props {
  tank: any;
  defects: Defect[];
  activeComponent: string;
  onComponentClick: (comp: string) => void;
}

export function TankMinimap3D({ tank, defects, activeComponent, onComponentClick }: Props) {
  const TANK_DIAMETER = tank?.diameterM ?? 42.0; 
  const TANK_HEIGHT = tank?.heightM ?? 15.0; 
  const rMax = TANK_DIAMETER / 2.0;

  return (
    <div className="tims-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">3D Live Overview</p>
      </div>
      
      {/* Interactive Tabs synced with main view */}
      <div className="flex flex-wrap gap-1 mb-3">
        {['ROOF', 'SHELL', 'FLOOR', 'NOZZLE', 'FOUNDATION'].map((part) => (
          <button 
            key={part} 
            onClick={() => onComponentClick(part)}
            className={`text-[10px] px-2 py-1 rounded border transition ${
              activeComponent === part 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {part}
          </button>
        ))}
      </div>
      
      <div className="relative bg-gradient-to-b from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden" style={{ height: 260 }}>
        <svg viewBox="0 0 420 300" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="tankBody" x1="0" x2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="45%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>
          
          {/* Base Tank Geometry */}
          <ellipse cx="210" cy="230" rx="130" ry="32" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="4" strokeDasharray="8 4" />
          <ellipse cx="210" cy="70" rx="115" ry="28" fill="#dbeafe" stroke="#64748b" strokeWidth="2" />
          <rect x="95" y="70" width="230" height="150" fill="url(#tankBody)" stroke="#64748b" strokeWidth="2" />
          <ellipse cx="210" cy="220" rx="115" ry="28" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
          
          {/* Map Defect Points in 3D Isometric Space */}
          {defects.map((d: Defect) => {
            let cx = -100, cy = -100, isVisible = false;

            if (['SHELL', 'NOZZLE'].includes(d.component) && d.angleDeg != null && d.heightM != null) {
              if (d.angleDeg >= 90 && d.angleDeg <= 270) { // Only show front-facing defects
                isVisible = true;
                cx = 95 + (((d.angleDeg - 90) / 180.0) * 230); 
                cy = 70 + ((1.0 - (d.heightM / TANK_HEIGHT)) * 150); 
              }
            } else if (d.component === 'FLOOR' && d.radiusM != null && d.angleDeg != null) {
              isVisible = true;
              const angleRad = (d.angleDeg - 90) * (Math.PI / 180);
              cx = 210 + ((d.radiusM / rMax) * 115 * Math.cos(angleRad));
              cy = 220 + ((d.radiusM / rMax) * 28 * Math.sin(angleRad));
            } else if (d.component === 'ROOF' && d.radiusM != null && d.angleDeg != null) {
              isVisible = true;
              const angleRad = (d.angleDeg - 90) * (Math.PI / 180);
              cx = 210 + ((d.radiusM / rMax) * 115 * Math.cos(angleRad));
              cy = 70 + ((d.radiusM / rMax) * 28 * Math.sin(angleRad));
            }

            if (!isVisible) return null;

            const isHigh = d.eemua159Class === 3;
            const isMed = d.eemua159Class === 2;
            const color = isHigh ? '#dc2626' : isMed ? '#f97316' : '#22c55e';
            const radius = isHigh ? 6 : 4;

            if (d.component === 'NOZZLE') {
              return (
                <rect key={d.id} x={cx - radius} y={cy - radius} width={radius * 2} height={radius * 2} fill={color} stroke="#1e293b" strokeWidth="1.5" className={isHigh ? 'animate-pulse' : ''} />
              );
            }

            return (
              <circle key={d.id} cx={cx} cy={cy} r={radius} fill={color} stroke="#ffffff" strokeWidth="1" className={isHigh ? 'animate-pulse' : ''} />
            );
          })}
        </svg>
        
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded border border-slate-200 px-2 py-1.5 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Remaining Life</p>
          <p className="text-sm font-bold text-green-600">{tank?.remainingLife ?? '--'} yr</p>
        </div>
      </div>
    </div>
  );
}
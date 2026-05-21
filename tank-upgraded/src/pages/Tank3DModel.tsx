import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tankApi } from '../services/api';
import { ArrowLeft } from 'lucide-react';
import type { Defect } from '../types/api';

function Spinner() {
  return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
}

const PARTS = ['ALL', 'ROOF', 'SHELL', 'NOZZLE', 'FLOOR', 'FOUNDATION'];

export default function Tank3DModel() {
  const { tankId } = useParams<{ tankId: string }>();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // 1. Fetch Tank Details
  const tankQ = useQuery({
    queryKey: ['tanks', tankId],
    queryFn: () => tankApi.getDetail(tankId!),
    enabled: !!tankId,
    staleTime: 60_000,
  });

  // 2. Fetch Defects
  const defectsQ = useQuery({
    queryKey: ['tanks', tankId, 'defects'],
    queryFn: () => tankApi.getDefects(tankId!),
    enabled: !!tankId,
    staleTime: 60_000,
  });

  const tank = tankQ.data as any;
  const rawDefects = (defectsQ.data as any[]) ?? [];
  const isLoading = tankQ.isLoading || defectsQ.isLoading;

  const filteredDefects = activeFilter === 'ALL' 
    ? rawDefects 
    : rawDefects.filter(d => (d.component || 'FLOOR').toUpperCase() === activeFilter);

  return (
    <div className="p-5 animate-page max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Overview
          </button>
          <h1 className="text-2xl font-bold text-slate-900">3D Integrity Model — {tankId}</h1>
          <p className="text-sm text-slate-500">Interactive isometric projection of all registered defects.</p>
        </div>
        
        {/* Component Filters */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
          {PARTS.map(part => (
            <button 
              key={part} 
              onClick={() => setActiveFilter(part)}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                activeFilter === part 
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              {part}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="relative bg-gradient-to-b from-slate-50 to-slate-200 rounded-2xl border border-slate-300 shadow-lg overflow-hidden" style={{ minHeight: '70vh' }}>
          
          {/* Scaled up 2x for full-screen view */}
          <svg viewBox="0 0 840 600" className="absolute inset-0 w-full h-full drop-shadow-xl">
            <defs>
              <linearGradient id="tankBodyLg" x1="0" x2="1">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="45%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
            
            {/* 1. FOUNDATION Base Ring */}
            <ellipse cx="420" cy="460" rx="260" ry="64" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="6" strokeDasharray="16 8" />
            
            {/* 2. ROOF */}
            <ellipse cx="420" cy="140" rx="230" ry="56" fill="#dbeafe" stroke="#64748b" strokeWidth="3" />
            
            {/* 3. SHELL Body */}
            <rect x="190" y="140" width="460" height="300" fill="url(#tankBodyLg)" stroke="#64748b" strokeWidth="3" />
            
            {/* 4. FLOOR */}
            <ellipse cx="420" cy="440" rx="230" ry="56" fill="#94a3b8" stroke="#475569" strokeWidth="3" />
            
            {/* Plot Dynamic Defects (Scaled 2x) */}
            {filteredDefects.map((d: any) => {
              const comp = (d.component || 'FLOOR').toUpperCase();
              const TANK_DIAMETER = tank?.diameterM ?? 42.0; 
              const TANK_HEIGHT = tank?.heightM ?? 15.0; 
              const rMax = TANK_DIAMETER / 2.0;

              let cx = -100, cy = -100;
              let isVisible = false;

              // A. SHELL & NOZZLE
              if (['SHELL', 'NOZZLE'].includes(comp) && d.angleDeg != null && d.heightM != null) {
                if (d.angleDeg >= 90 && d.angleDeg <= 270) {
                  isVisible = true;
                  const xPct = (d.angleDeg - 90) / 180.0;
                  cx = 190 + (xPct * 460); 
                  const yPct = 1.0 - (d.heightM / TANK_HEIGHT);
                  cy = 140 + (yPct * 300); 
                }
              }
              // B. FLOOR
              else if (comp === 'FLOOR' && d.radiusM != null && d.angleDeg != null) {
                isVisible = true;
                const rPct = d.radiusM / rMax;
                const angleRad = (d.angleDeg - 90) * (Math.PI / 180);
                cx = 420 + (rPct * 230 * Math.cos(angleRad));
                cy = 440 + (rPct * 56 * Math.sin(angleRad));
              }
              // C. ROOF
              else if (comp === 'ROOF' && d.radiusM != null && d.angleDeg != null) {
                isVisible = true;
                const rPct = d.radiusM / rMax;
                const angleRad = (d.angleDeg - 90) * (Math.PI / 180);
                cx = 420 + (rPct * 230 * Math.cos(angleRad));
                cy = 140 + (rPct * 56 * Math.sin(angleRad));
              }
              // D. FOUNDATION
              else if (comp === 'FOUNDATION' && d.angleDeg != null) {
                isVisible = true;
                const rPct = d.radiusM != null ? (d.radiusM / rMax) : 1.05; 
                const angleRad = (d.angleDeg - 90) * (Math.PI / 180);
                cx = 420 + (rPct * 260 * Math.cos(angleRad));
                cy = 460 + (rPct * 64 * Math.sin(angleRad));
              }

              if (!isVisible) return null;

              const eemuaClass = d.eemua159Class ?? d.defectClassNum ?? 2;
              const isHigh = eemuaClass === 3;
              const isMed = eemuaClass === 2;
              const color = isHigh ? '#dc2626' : isMed ? '#f59e0b' : '#22c55e';
              const radius = isHigh ? 12 : 8; // Scaled up dot size

              // NOZZLE Square
              if (comp === 'NOZZLE') {
                return (
                  <rect key={d.id ?? d.defectCode} x={cx - radius} y={cy - radius} width={radius * 2} height={radius * 2}
                    fill={color} stroke="#ffffff" strokeWidth="2" className={isHigh ? 'animate-pulse' : ''} >
                    <title>{`${d.defectCode ?? d.id} - NOZZLE\nClass: ${eemuaClass}\nLoss: ${d.maxLossPct ?? 0}%`}</title>
                  </rect>
                );
              }

              // Normal Circle
              return (
                <circle key={d.id ?? d.defectCode} cx={cx} cy={cy} r={radius}
                  fill={color} stroke="#ffffff" strokeWidth="2" className={isHigh ? 'animate-pulse' : ''} >
                  <title>{`${d.defectCode ?? d.id} - ${comp}\nClass: ${eemuaClass}\nLoss: ${d.maxLossPct ?? 0}%`}</title>
                </circle>
              );
            })}
          </svg>
          
          {/* Legend */}
          <div className="absolute bottom-5 right-5 bg-white/90 backdrop-blur rounded-lg border border-slate-200 p-4 shadow-md">
            <p className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Legend</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600 border border-white"></div><span className="text-xs text-slate-600">Class 3 (High)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 border border-white"></div><span className="text-xs text-slate-600">Class 2 (Medium)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 border border-white"></div><span className="text-xs text-slate-600">Class 1 (Low)</span></div>
              <div className="h-px bg-slate-200 my-2"></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-400 border border-slate-800"></div><span className="text-xs text-slate-600">Nozzle Indicator</span></div>
            </div>
          </div>

          {/* Quick Stats Overlay */}
          <div className="absolute top-5 left-5 bg-white/90 backdrop-blur rounded-lg border border-slate-200 p-4 shadow-md w-48">
            <div className="mb-3">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Remaining Life</p>
              <p className={`text-2xl font-bold ${((tank?.remainingLife) ?? 99) < 2 ? 'text-red-600' : 'text-green-600'}`}>
                {tank?.remainingLife ?? '--'} yrs
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Total Defects Displayed</p>
              <p className="text-xl font-bold text-slate-800">{filteredDefects.length}</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { heatmapApi, tankApi } from '../services/api';
import { D3FloorHeatmap, HeatmapTimeSlider, HeatmapLegend } from '../components/heatmap/D3FloorHeatmap';
import { Download, Paperclip } from 'lucide-react';
import type { Defect } from '../types/api';

function Spinner() {
  return <div className="flex items-center justify-center py-16"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>;
}

const CLASS_COLORS: Record<number, string> = { 1:'#22c55e', 2:'#f97316', 3:'#ef4444' };
const CLASS_LABELS: Record<number, string> = { 1:'Class 1 (Low)', 2:'Class 2 (Medium)', 3:'Class 3 (High)' };
const TIMELINE = [2015, 2021, 2026];

function polarToXY(rPct: number, angleDeg: number, cx: number, cy: number, R: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + rPct * R * Math.cos(rad), y: cy + rPct * R * Math.sin(rad) };
}

export default function Heatmap() {
  const { tankId = 'T-105' } = useParams<{ tankId: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Defect | null>(null);
  const [selectedDatasetIdx, setSelectedDatasetIdx] = useState(0);

  // Real API: heatmap timeline + defects
  const timelineQ = useQuery({
    queryKey: ['heatmap', tankId, 'timeline'],
    queryFn: () => heatmapApi.getTimeline(tankId),
    staleTime: 60_000,
  });

  const defectsQ = useQuery({
    queryKey: ['tanks', tankId, 'defects'],
    queryFn: () => tankApi.getDefects(tankId),
    staleTime: 60_000,
  });

  const datasets: any[] = timelineQ.data ?? [];
  const rawDefects = (defectsQ.data as any[]) ?? [];

  // Normalize defects to expected shape
  const defects: Defect[] = rawDefects.map((d: any, idx: number) => ({
    id: d.id ?? d.defectCode ?? `D${idx+1}`,
    tankId: d.tankId ?? tankId,
    location: d.location ?? `${d.component} ${d.plateId ?? ''}`.trim(),
    component: d.component ?? 'FLOOR',
    type: d.type ?? d.defectType ?? 'Unknown',
    severity: d.severity ?? 'MEDIUM',
    eemua159Class: d.eemua159Class ?? d.classNum ?? 2,
    maxLossPct: d.maxLossPct ?? d.maxLoss ?? 0,
    wallLossMm: d.wallLossMm ?? d.wallLoss ?? 0,
    remainingThickness: d.remainingThickness ?? 0,
    firstDetected: d.firstDetected ?? d.firstDetectedDate ?? '',
    lastObserved: d.lastObserved ?? '',
    status: d.status ?? 'OPEN',
    disposition: d.disposition ?? '—',
    growthRate: d.growthRate ?? 0,
    growthSinceLastMm: d.growthSinceLastMm ?? 0,
    linkedDataset: d.linkedDataset,
    nx: d.nx ?? 0.5,
    ny: d.ny ?? 0.5,
    radiusPx: d.radiusPx ?? 14,
  }));

  const CX = 230, CY = 230, R = 190;
  const classCounts = defects.reduce((acc, d) => {
    acc[d.eemua159Class] = (acc[d.eemua159Class] ?? 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const isLoading = timelineQ.isLoading || defectsQ.isLoading;

  return (
    <div className="p-5 animate-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Floor Heatmap & Defect Map — {tankId}</h1>
        <div className="flex items-center gap-2">
          <select className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none">
            {datasets.length > 0
              ? datasets.map((ds: any) => <option key={ds.datasetId}>{ds.label}</option>)
              : <option>Apr 2026 (MFL)</option>}
          </select>
          <select className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none">
            <option>Compare: 2021</option><option>Compare: 2015</option>
          </select>
          <select className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none">
            <option>Metric: Loss (%)</option><option>Metric: Thickness (mm)</option>
          </select>
          <button className="btn-secondary text-xs"><Download className="w-3.5 h-3.5"/> Export PNG</button>
          <button className="btn-primary text-xs" onClick={() => navigate(`/reports/${tankId}`)}><Paperclip className="w-3.5 h-3.5"/> Attach to WSE</button>
        </div>
      </div>

      {isLoading ? <Spinner/> : (
        <div className="flex gap-4">
          {/* Heatmap canvas */}
          <div className="tims-card p-4 flex-1">
            {/* D3 heatmap with real defects */}
            <div className="flex items-center justify-center mb-2">
              <D3FloorHeatmap
                readings={[]}
                defects={defects}
                selectedDefectId={selected?.id ?? null}
                onDefectClick={(d) => setSelected(d as Defect)}
                tankDiameterM={42}
                width={440}
                height={440}
              />
            </div>

            <HeatmapLegend />

            {/* Defect list table */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-sm font-semibold text-slate-700 mb-2">Defect List ({defects.length})</p>
              <table className="w-full tims-table">
                <thead><tr><th>ID</th><th>Component</th><th>Type</th><th>Max Loss %</th><th>Wall Loss (mm)</th><th>Class</th><th>Status</th></tr></thead>
                <tbody>
                  {defects.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-slate-400 py-6 text-sm">No defect data from backend</td></tr>
                  ) : defects.map(d => (
                    <tr key={d.id} className={`cursor-pointer ${selected?.id===d.id?'bg-blue-50':''}`} onClick={() => setSelected(d)}>
                      <td className="font-mono text-xs font-semibold">{d.id}</td>
                      <td className="text-xs">{d.component}</td>
                      <td className="text-xs">{d.type}</td>
                      <td className="text-xs font-semibold">{d.maxLossPct}%</td>
                      <td className="text-xs">{d.wallLossMm} mm</td>
                      <td><span className={d.eemua159Class===3?'badge-high':d.eemua159Class===2?'badge-medium':'badge-low'}>Class {d.eemua159Class}</span></td>
                      <td><span className={d.status==='OPEN'?'badge-open':'badge-complete'}>{d.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-72 shrink-0 space-y-3">
            {/* Selected defect detail */}
            <div className="tims-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-slate-800">Selected Defect</p>
                {selected && <span className="badge-high px-2 py-1 text-[10px] uppercase">Class {selected.eemua159Class}</span>}
              </div>
              {selected ? (
                <>
                  <p className="text-base font-bold text-slate-900 mb-3">{selected.id}</p>
                  <div className="space-y-2">
                    {[
                      ['Type', selected.type],
                      ['Component', selected.component],
                      ['Location', selected.location],
                      ['Max Loss', `${selected.maxLossPct}%`],
                      ['Wall Loss', `${selected.wallLossMm} mm`],
                      ['Growth Rate', `${selected.growthRate} mm/yr`],
                      ['Disposition', selected.disposition],
                      ['Status', selected.status],
                    ].map(([k,v]) => (
                      <div key={k}>
                        <p className="field-label">{k}</p>
                        <p className="text-xs font-medium text-slate-800">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="btn-primary text-xs flex-1 justify-center">Open Engineering Note</button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">Click a defect marker or row to view details</p>
              )}
            </div>

            {/* Time slider (from real datasets) */}
            {datasets.length > 0 && (
              <HeatmapTimeSlider
                datasets={datasets.map((ds: any) => ({ id: ds.datasetId, label: ds.label, date: ds.date }))}
                selectedIndex={selectedDatasetIdx}
                onChange={setSelectedDatasetIdx}
              />
            )}

            {/* Inspection comparison */}
            <div className="tims-card p-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">Inspection Comparison</p>
              <div className="relative mb-1">
                <div className="h-0.5 bg-blue-600 w-full mt-3"/>
                <div className="flex justify-between -mt-3">
                  {TIMELINE.map((y,i) => (
                    <div key={y} className="flex flex-col items-center gap-1">
                      <div className={`w-3 h-3 rounded-full border-2 border-white ${i===TIMELINE.length-1?'bg-red-500':i===1?'bg-blue-700':'bg-blue-400'}`}/>
                      <span className={`text-[11px] font-semibold ${i===TIMELINE.length-1?'text-red-600':i===1?'text-blue-700':'text-slate-400'}`}>{y}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">Defect count progression tracked across inspection cycles.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

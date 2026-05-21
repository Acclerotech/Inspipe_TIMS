import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { heatmapApi, tankApi } from '../services/api';
import { D3FloorHeatmap, HeatmapTimeSlider, HeatmapLegend } from '../components/heatmap/D3FloorHeatmap';
import { D3ShellHeatmap } from '../components/heatmap/D3ShellHeatmap';
import { D3RoofHeatmap } from '../components/heatmap/D3RoofHeatmap';
import { D3FoundationHeatmap } from '../components/heatmap/D3FoundationHeatmap';
import { D3NozzleHeatmap } from '../components/heatmap/D3NozzleHeatmap';
import { Download, Paperclip } from 'lucide-react';
import type { Defect } from '../types/api';

function Spinner() {
  return <div className="flex items-center justify-center py-16"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>;
}

const TIMELINE = [2015, 2021, 2026];
const COMPONENT_TABS = ['ROOF', 'SHELL', 'FLOOR', 'NOZZLE', 'FOUNDATION'];

export default function Heatmap() {
  const { tankId = 'T-105' } = useParams<{ tankId: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Defect | null>(null);
  const [selectedDatasetIdx, setSelectedDatasetIdx] = useState(0);
  const [activeComponent, setActiveComponent] = useState<string>('FLOOR');

  // Fetch Tank Details (for Diameter and Height properties)
  const tankQ = useQuery({
    queryKey: ['tanks', tankId],
    queryFn: () => tankApi.getDetail(tankId),
    enabled: !!tankId,
    staleTime: 60_000,
  });

  // Fetch Heatmap timeline datasets
  const timelineQ = useQuery({
    queryKey: ['heatmap', tankId, 'timeline'],
    queryFn: () => heatmapApi.getTimeline(tankId),
    staleTime: 60_000,
  });

  // Fetch Defect tracking data streams
  const defectsQ = useQuery({
    queryKey: ['tanks', tankId, 'defects'],
    queryFn: () => tankApi.getDefects(tankId),
    refetchInterval: 5000,
    staleTime: 60_000,
  });

  const datasets: any[] = timelineQ.data ?? [];
  const rawDefects = (defectsQ.data as any[]) ?? [];
  
  const tankData = tankQ.data as any;
  const TANK_DIAMETER = tankData?.diameterM ?? tankData?.diameter ?? 42.0; 
  const TANK_HEIGHT = tankData?.heightM ?? tankData?.height ?? 15.0; 
  const rMax = TANK_DIAMETER / 2.0;

  // ── PASS 1: EXTRACT VALID COORD PROPERTIES ACROSS MIXED METRIC SCHEMAS ──
  const parsedDefects = rawDefects.map((d: any, idx: number) => {
    const isCircular = ['FLOOR', 'ROOF', 'FOUNDATION'].includes(d.component);
    const isCylindrical = ['SHELL', 'NOZZLE'].includes(d.component);
    
    // Support varying property names across inspection databases
    const radius = d.radiusM ?? d.radius ?? d.distanceM ?? d.distance ?? d.r;
    const angle = d.angleDeg ?? d.angle ?? d.degree ?? d.deg ?? d.theta;
    const height = d.heightM ?? d.height ?? d.elevation ?? d.h;
    const nxRaw = d.nx ?? d.x ?? d.xPct;
    const nyRaw = d.ny ?? d.y ?? d.yPct;

    let calculatedNx = 0.5;
    let calculatedNy = 0.5;
    let hasValidCoords = false;

    if (isCircular && radius != null && angle != null && Number(radius) > 0) {
      const structuralRadiusMax = rMax > 0 ? rMax : 21.0; 
      const rPct = Number(radius) / structuralRadiusMax;
      const angleRad = (Number(angle) - 90) * (Math.PI / 180);
      calculatedNx = 0.5 + (rPct * Math.cos(angleRad)) * 0.5;
      calculatedNy = 0.5 + (rPct * Math.sin(angleRad)) * 0.5;
      hasValidCoords = true;
    } else if (isCylindrical && angle != null && height != null) {
      const structuralHeightMax = TANK_HEIGHT > 0 ? TANK_HEIGHT : 15.0;
      calculatedNx = Number(angle) / 360.0;
      calculatedNy = 1.0 - (Number(height) / structuralHeightMax);
      hasValidCoords = true;
    } else if (nxRaw != null && nyRaw != null && (Number(nxRaw) !== 0.5 || Number(nyRaw) !== 0.5)) {
      calculatedNx = Number(nxRaw);
      calculatedNy = Number(nyRaw);
      hasValidCoords = true;
    }

    return { raw: d, idx, component: d.component ?? 'FLOOR', hasValidCoords, nx: calculatedNx, ny: calculatedNy };
  });

  // ── PASS 2: DISTRIBUTE CENTER-LOCKED RECORDS INTO STRUCTURAL CONSTELLATIONS ──
  const defects: Defect[] = [];
  COMPONENT_TABS.forEach(comp => {
    const compDefects = parsedDefects.filter(m => m.component === comp);
    const missingCoords = compDefects.filter(m => !m.hasValidCoords);
    const validCoords = compDefects.filter(m => m.hasValidCoords);

    // Spread unlocated items into interactive rings so they are fully distinct and clickable
    missingCoords.forEach((m, i) => {
      let finalNx = 0.5;
      let finalNy = 0.5;
      
      if (missingCoords.length > 1) {
        // Arrange items uniformly along an active geometric radius line
        const ringRadius = comp === 'FOUNDATION' ? 0.44 : 0.28; 
        const angleRad = (i * (360 / missingCoords.length)) * (Math.PI / 180);
        finalNx = 0.5 + ringRadius * Math.cos(angleRad);
        finalNy = 0.5 + ringRadius * Math.sin(angleRad);
      } else if (missingCoords.length === 1) {
        // Position single unmapped elements cleanly onto key structural components
        finalNx = 0.5;
        finalNy = comp === 'FOUNDATION' ? 0.08 : 0.25; 
      }

      const d = m.raw;
      defects.push(createDefectObject(d, m.idx, finalNx, finalNy));
    });

    // Keep precisely mapped elements in their original coordinates
    validCoords.forEach(m => {
      defects.push(createDefectObject(m.raw, m.idx, m.nx, m.ny));
    });
  });

  // Helper function to build the generic Defect payload shape
  function createDefectObject(d: any, index: number, nxValue: number, nyValue: number): Defect {
    return {
      id: d.id ?? d.defectCode ?? `D${index + 1}`,
      tankId: d.tankId ?? tankId,
      location: d.location ?? `${d.component} ${d.plateId ?? ''}`.trim(),
      component: d.component ?? 'FLOOR',
      type: d.type ?? d.defectType ?? 'Unknown',
      severity: d.severity ?? 'MEDIUM',
      eemua159Class: d.eemua159Class ?? d.defectClassNum ?? 2, 
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
      nx: nxValue,
      ny: nyValue,
      radiusPx: d.radiusPx ?? 14,
    };
  }

  const visibleDefects = defects.filter(d => d.component === activeComponent);
  const isLoading = timelineQ.isLoading || defectsQ.isLoading || tankQ.isLoading;

  return (
    <div className="p-5 animate-page">
      {/* ACTION TOP HEADER CONTROLS */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Mechanical Integrity Defect Map — {tankId}</h1>
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
          {/* Main Visualizer Workspace Panel */}
          <div className="tims-card p-4 flex-1">
            
            {/* Component Structural Tabs */}
            <div className="flex gap-1 justify-center mb-6 border-b border-slate-200 pb-2">
              {COMPONENT_TABS.map(tab => (
                <button 
                  key={tab}
                  onClick={() => {
                    setActiveComponent(tab);
                    setSelected(null); 
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-t-md transition-colors ${
                    activeComponent === tab 
                      ? 'bg-[#1e3a8a] text-white border-b-2 border-[#1e3a8a]' 
                      : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* D3 Projection Routing Context */}
            <div className="flex items-center justify-center mb-2 min-h-[440px]">
              {activeComponent === 'FLOOR' && (
                <D3FloorHeatmap readings={[]} defects={visibleDefects} selectedDefectId={selected?.id ?? null} onDefectClick={(d) => setSelected(d as Defect)} tankDiameterM={TANK_DIAMETER} width={440} height={440} />
              )}
              {activeComponent === 'ROOF' && (
                <D3RoofHeatmap defects={visibleDefects} selectedDefectId={selected?.id ?? null} onDefectClick={(d) => setSelected(d as Defect)} tankDiameterM={TANK_DIAMETER} width={440} height={440} />
              )}
              {activeComponent === 'FOUNDATION' && (
                <D3FoundationHeatmap defects={visibleDefects} selectedDefectId={selected?.id ?? null} onDefectClick={(d) => setSelected(d as Defect)} tankDiameterM={TANK_DIAMETER} width={440} height={440} />
              )}
              {activeComponent === 'SHELL' && (
                <D3ShellHeatmap defects={visibleDefects} selectedDefectId={selected?.id ?? null} onDefectClick={(d) => setSelected(d as Defect)} tankHeightM={TANK_HEIGHT} width={600} height={350} />
              )}
              {activeComponent === 'NOZZLE' && (
                <D3NozzleHeatmap defects={visibleDefects} selectedDefectId={selected?.id ?? null} onDefectClick={(d) => setSelected(d as Defect)} tankHeightM={TANK_HEIGHT} width={600} height={350} />
              )}
            </div>

            <HeatmapLegend />

            {/* Active Component Data Logs */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-sm font-semibold text-slate-700 mb-2">Active Anomaly Records ({visibleDefects.length})</p>
              <table className="w-full tims-table">
                <thead>
                  <tr><th>ID</th><th>Component</th><th>Type</th><th>Max Loss %</th><th>Wall Loss</th><th>Class</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {visibleDefects.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-slate-400 py-6 text-sm">No indications noted on this segment.</td></tr>
                  ) : visibleDefects.map(d => (
                    <tr key={d.id} className={`cursor-pointer ${selected?.id === d.id ? 'bg-blue-50' : ''}`} onClick={() => setSelected(d)}>
                      <td className="font-mono text-xs font-semibold">{d.id}</td>
                      <td className="text-xs">{d.component}</td>
                      <td className="text-xs">{d.type}</td>
                      <td className="text-xs font-semibold">{d.maxLossPct}%</td>
                      <td className="text-xs">{d.wallLossMm} mm</td>
                      <td><span className={d.eemua159Class === 3 ? 'badge-high' : d.eemua159Class === 2 ? 'badge-medium' : 'badge-low'}>Class {d.eemua159Class}</span></td>
                      <td><span className={d.status === 'OPEN' ? 'badge-open' : 'badge-complete'}>{d.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Profile Panel */}
          <div className="w-72 shrink-0 space-y-3">
            <div className="tims-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-slate-800">Defect Profile</p>
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
                <p className="text-xs text-slate-400">Select an asset marker or table row path to trace data metrics.</p>
              )}
            </div>

            {/* Time Slider */}
            {datasets.length > 0 && (
              <HeatmapTimeSlider
                datasets={datasets.map((ds: any) => ({ id: ds.datasetId, label: ds.label, date: ds.date }))}
                selectedIndex={selectedDatasetIdx}
                onChange={setSelectedDatasetIdx}
              />
            )}

            {/* Inspection Progress Tracking Block */}
            <div className="tims-card p-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">Inspection Comparison</p>
              <div className="relative mb-1">
                <div className="h-0.5 bg-blue-600 w-full mt-3"/>
                <div className="flex justify-between -mt-3">
                  {TIMELINE.map((y,i) => (
                    <div key={y} className="flex flex-col items-center gap-1">
                      <div className={`w-3 h-3 rounded-full border-2 border-white ${i === TIMELINE.length - 1 ? 'bg-red-500' : i === 1 ? 'bg-blue-700' : 'bg-blue-400'}`}/>
                      <span className={`text-[11px] font-semibold ${i === TIMELINE.length - 1 ? 'text-red-600' : i === 1 ? 'text-blue-700' : 'text-slate-400'}`}>{y}</span>
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
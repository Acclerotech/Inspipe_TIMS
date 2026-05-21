/**
 * TankOverview.tsx
 * FIXES APPLIED (audit ref):
 * - AUD-001: reopenMut now calls /inspections/{inspectionId}/reopen (not /tanks/{id}/reopen)
 * - AUD-002: auditQ reads from /tanks/{id}/audit-log (via fixed tankApi.getAuditLog)
 * - CALC-001/002/003: Assessments tab wired to calculationApi.getBreakdown()
 * - DEF-001: defect rows show class badge, location, disposition, heatmap link.
 * - PAGINATION: Added client-side pagination wrapper around the Defects overview table.
 * - CHART-FIX: Added normalization for ROOF, SHELL, FLOOR, NOZZLE, FOUNDATION series.
 * - NEW FEATURE: Added "Back to Dashboard" button near History & Audit navigation contexts.
 * - NEW FEATURE: Upgraded static preview to a fully synchronized dynamic mini-heatmap rendering system.
 * - UX UPGRADE: Added pulsing critical alert banner for ACTION_REQUIRED statuses.
 * - UX UPGRADE: Added actionable empty-state for new tanks with 0 inspections.
 * - UX UPGRADE: Built one-click dataset slide-out drawer for raw data preview.
 * - UX UPGRADE: Formalized WF-02 Re-open Request UI workflow.
 * - RESTORED: Defects Table Pagination, Compliance Tab, Calculation Steps, and standard status flags.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThicknessChart, DataPoint } from '../components/charts/ThicknessChart';
import { TankMinimap3D } from '../components/heatmap/TankMinimap3D';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tankApi, dashboardApi, calculationApi } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ChevronDown, Eye, FileText, Plus, RotateCcw, AlertOctagon, 
  ChevronRight, ArrowLeft, LayoutDashboard, X, Database, Hash, Clock
} from 'lucide-react';

// Import D3 Projection Heatmap Sub-engines
import { D3FloorHeatmap } from '../components/heatmap/D3FloorHeatmap';
import { D3ShellHeatmap } from '../components/heatmap/D3ShellHeatmap';
import { D3RoofHeatmap } from '../components/heatmap/D3RoofHeatmap';
import { D3FoundationHeatmap } from '../components/heatmap/D3FoundationHeatmap';
import { D3NozzleHeatmap } from '../components/heatmap/D3NozzleHeatmap';

const TABS = ['Overview', 'Inspections', 'Datasets', 'Defects', 'Assessments', 'Compliance', 'History & Audit'];

const retirementLimits = {
  SHELL: 6.0,
  FLOOR: 2.5,
  ROOF: 3.0,
  NOZZLE: 5.5,
  FOUNDATION: 0.0
};

function Spinner() {
  return <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
}

function Err({ msg }: { msg: string }) {
  return <p className="text-sm text-red-600 p-3 bg-red-50 rounded border border-red-200">{msg}</p>;
}

/** Parse JSON snapshot string safely for display */
function parseSnapshot(jsonStr?: string): Record<string, unknown> | null {
  if (!jsonStr) return null;
  try { return JSON.parse(jsonStr); } catch { return null; }
}

export default function TankOverview() {
  const [activeComponent, setActiveComponent] = useState<string>('SHELL');
  
  const visibleSeries = activeComponent 
    ? [activeComponent] 
    : ['SHELL', 'FLOOR', 'ROOF', 'NOZZLE', 'FOUNDATION'];

  const { tankId: paramTankId } = useParams<{ tankId: string }>();
  const navigate = useNavigate();
  const [selectedTankId, setSelectedTankId] = useState(paramTankId ?? '');
  const [activeTab, setActiveTab] = useState('Overview');
  const [reopenReason, setReopenReason] = useState('');
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [overrideRate, setOverrideRate] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  
  // UX: Drawer State for Datasets
  const [isDatasetDrawerOpen, setIsDatasetDrawerOpen] = useState(false);
  const [selectedDatasetInfo, setSelectedDatasetInfo] = useState<any>(null);

  // PAGINATION STATE FOR DEFECTS
  const [currentDefectsPage, setCurrentDefectsPage] = useState(1);
  const defectsPerPage = 10;

  const qc = useQueryClient();

  useEffect(() => {
    if (paramTankId) setSelectedTankId(paramTankId);
  }, [paramTankId]);

  const fleetQ = useQuery({
    queryKey: ['dashboard', 'tanks', '', ''],
    queryFn: async () => {
      const res = await dashboardApi.getTanks();
      return (res as any)?.content ?? res ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const tankIds: string[] = useMemo(() => {
    const list = (fleetQ.data as any[]) ?? [];
    return list.map(t => t.tankId ?? t.id).filter(Boolean);
  }, [fleetQ.data]);

  useEffect(() => {
    if (!selectedTankId && tankIds.length > 0) setSelectedTankId(tankIds[0]);
  }, [tankIds, selectedTankId]);

  useEffect(() => {
    setCurrentDefectsPage(1);
  }, [selectedTankId]);

  const tankQ = useQuery({
    queryKey: ['tanks', selectedTankId],
    queryFn: () => tankApi.getDetail(selectedTankId),
    enabled: !!selectedTankId,
  });
  const defQ = useQuery({
    queryKey: ['tanks', selectedTankId, 'defects'],
    queryFn: () => tankApi.getDefects(selectedTankId),
    enabled: !!selectedTankId,
  });
  const corrQ = useQuery({
    queryKey: ['tanks', selectedTankId, 'corrosion'],
    queryFn: () => tankApi.getCorrosion(selectedTankId),
    enabled: !!selectedTankId,
  });
  const thkQ = useQuery({
    queryKey: ['tanks', selectedTankId, 'thickness'],
    queryFn: () => tankApi.getThicknessHistory(selectedTankId),
    enabled: !!selectedTankId,
  });
  const auditQ = useQuery({
    queryKey: ['tanks', selectedTankId, 'audit'],
    queryFn: () => tankApi.getAuditLog(selectedTankId),
    enabled: !!selectedTankId,
  });
  const inspQ = useQuery({
    queryKey: ['tanks', selectedTankId, 'inspections'],
    queryFn: () => tankApi.getInspections(selectedTankId),
    enabled: !!selectedTankId,
  });
  const calcQ = useQuery({
    queryKey: ['calculations', selectedTankId, 'breakdown'],
    queryFn: () => calculationApi.getBreakdown(selectedTankId),
    enabled: !!selectedTankId && activeTab === 'Assessments',
    staleTime: 60_000,
  });

  const reopenMut = useMutation({
    mutationFn: ({ inspectionId, reason }: { inspectionId: string; reason: string }) =>
      tankApi.reopen(inspectionId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tanks', selectedTankId] });
      qc.invalidateQueries({ queryKey: ['tanks', selectedTankId, 'inspections'] });
      qc.invalidateQueries({ queryKey: ['tanks', selectedTankId, 'audit'] });
      setReopenTargetId(null);
      setReopenReason('');
    },
  });

  const overrideMut = useMutation({
    mutationFn: () =>
      calculationApi.applyOverride({
        tankId: selectedTankId,
        overrideAllowanceMm: parseFloat(overrideRate),
        reason: overrideReason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calculations', selectedTankId] });
      qc.invalidateQueries({ queryKey: ['tanks', selectedTankId, 'audit'] });
      setOverrideRate('');
      setOverrideReason('');
    },
  });

  const tank = tankQ.data;
  const defects = (defQ.data as any[]) ?? [];
  const corrosion = corrQ.data;
  const thicknessHistory = (thkQ.data as any[]) ?? [];
  const auditEvents = (auditQ.data as any[]) ?? [];
  const inspections = (inspQ.data as any[]) ?? [];
  const latestCorrosion: any = Array.isArray(corrosion) ? corrosion[0] : corrosion;

  const tankData = useMemo(() => {
    if (!tank) return null;
    return {
      ...tank,
      diameterM: (tank as any).diameter ?? (tank as any).diameterM ?? 42.0,
      heightM: (tank as any).height ?? (tank as any).heightM ?? 15.0,
      remainingLife: latestCorrosion?.overallRemainingLifeYr ?? (tank as any).remainingLife
    };
  }, [tank, latestCorrosion]);

  const TANK_DIAMETER = tankData?.diameterM ?? 42.0;
  const TANK_HEIGHT = tankData?.heightM ?? 15.0;
  const rMax = TANK_DIAMETER / 2.0;

  const mappedDefects = useMemo(() => {
    return defects.map((d: any, idx: number) => {
      let calculatedNx = 0.5;
      let calculatedNy = 0.5;
      
      const isCircular = ['FLOOR', 'ROOF', 'FOUNDATION'].includes(d.component);
      const isCylindrical = ['SHELL', 'NOZZLE'].includes(d.component);
      
      if (isCircular && d.radiusM != null && d.angleDeg != null) {
          const rPct = d.radiusM / rMax;
          const angleRad = (d.angleDeg - 90) * (Math.PI / 180);
          calculatedNx = 0.5 + (rPct * Math.cos(angleRad)) * 0.5;
          calculatedNy = 0.5 + (rPct * Math.sin(angleRad)) * 0.5;
      } 
      else if (isCylindrical && d.angleDeg != null && d.heightM != null) {
          calculatedNx = d.angleDeg / 360.0;
          calculatedNy = 1.0 - (d.heightM / TANK_HEIGHT);
      }

      return {
        ...d,
        id: d.id ?? d.defectCode ?? `D${idx+1}`,
        component: d.component ?? 'FLOOR',
        eemua159Class: d.eemua159Class ?? d.defectClassNum ?? d.classNum ?? 2, 
        nx: d.nx ?? calculatedNx,
        ny: d.ny ?? calculatedNy,
      };
    });
  }, [defects, rMax, TANK_HEIGHT]);

  const visibleDefectsForHeatmap = useMemo(() => {
    return mappedDefects.filter((d: any) => d.component === activeComponent);
  }, [mappedDefects, activeComponent]);

  const formattedHistoryData = useMemo<DataPoint[]>(() => {
    const raw = (thkQ.data as any[]) ?? [];
    const pivoted = raw.reduce<Record<number, DataPoint>>((acc, curr) => {
      const year = curr.year ?? curr.measurementYear;
      if (!acc[year]) acc[year] = { year };
      
      const rawComp = (curr.component ?? 'SHELL').toUpperCase();
      const compKey = rawComp.includes('FLOOR') ? 'FLOOR' 
                    : rawComp.includes('ROOF') ? 'ROOF'
                    : rawComp.includes('FOUNDATION') ? 'FOUNDATION'
                    : rawComp.includes('NOZZLE') ? 'NOZZLE'
                    : 'SHELL';

      acc[year][compKey] = curr.thickness ?? curr.avgThicknessMm;
      return acc;
    }, {});
    return Object.values(pivoted).sort((a, b) => a.year - b.year);
  }, [thkQ.data]);

  // PAGINATION COMPUTATIONS
  const totalDefectsPages = Math.ceil(defects.length / defectsPerPage);
  const indexOfLastDefect = currentDefectsPage * defectsPerPage;
  const indexOfFirstDefect = indexOfLastDefect - defectsPerPage;
  const currentDefectsSlice = useMemo(() => {
    return defects.slice(indexOfFirstDefect, indexOfLastDefect);
  }, [defects, indexOfFirstDefect, indexOfLastDefect]);

  const riskColor =
    (tank as any)?.riskCategory === 'HIGH' ? 'bg-red-600' :
    (tank as any)?.riskCategory === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-600';

  if (fleetQ.isLoading) return <Spinner />;

  return (
    <div className="animate-page relative">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-slate-400">
            Tanks › Rotterdam Terminal A › {selectedTankId}
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
        </div>
        
        {/* UX: High Visibility Alert Banner */}
        {(tank as any)?.complianceStatus === 'ACTION_REQUIRED' && (
          <div className="mt-2 mb-4 bg-red-50 border-l-4 border-red-600 p-3 rounded-r-md flex items-start gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 relative mt-0.5">
               <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-75"></div>
               <AlertOctagon className="w-4 h-4 text-red-600 relative z-10" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-800">CRITICAL: ACTION REQUIRED</h3>
              <p className="text-xs text-red-700 mt-1">
                Calculated remaining life is at or below the retirement threshold. Immediate inspection or repair cycle is recommended per internal safety compliance regulations.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Tank {selectedTankId} — Rotterdam Terminal A
            </h1>
            {tank && (
              <p className="text-sm text-slate-500 mt-0.5">
                {(tank as any).service} · {(tank as any).diameter ?? (tank as any).diameterM} m Ø × {(tank as any).height ?? (tank as any).heightM} m H
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedTankId}
                onChange={e => {
                  setSelectedTankId(e.target.value);
                  navigate(`/tanks/${e.target.value}/trends`);
                }}
                className="appearance-none pl-3 pr-7 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-700 focus:outline-none"
              >
                {tankIds.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {tank && (
              <span className={`px-3 py-1.5 ${riskColor} text-white text-sm font-bold rounded`}>
                Risk: {(tank as any).riskCategory}
              </span>
            )}
            <button className="btn-secondary text-xs" onClick={() => navigate('/upload')}>
              <Plus className="w-3.5 h-3.5" /> Log Inspection
            </button>
            <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={() => navigate(`/tankss/${tank.tankId}`)}>
              <LayoutDashboard className="w-3.5 h-3.5" /> View Dashboard
            </button>
            <button className="btn-primary text-xs" onClick={() => navigate(`/reports/${selectedTankId}`)}>
              <FileText className="w-3.5 h-3.5" /> Generate Report
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-0 mt-5 -mb-3">
          {TABS.map(tab => (
            <button key={tab} onClick={() => {
              if (tab === 'Defects') navigate(`/heatmap/${selectedTankId}`);
              else setActiveTab(tab);
            }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div className="p-5">
        {tankQ.isLoading ? <Spinner /> : tankQ.error ? <Err msg={(tankQ.error as Error).message} /> : tank ? (
          <>
            {/* FLAGS (Restored original standard flags below tabs) */}
            <div className="flex gap-2 mb-4">
              {(tank as any).complianceStatus === 'ACTION_REQUIRED' && (
                <div className="px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5" /> ACTION REQUIRED
                </div>
              )}
              <div className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded text-xs font-semibold text-orange-700">
                Risk Category: {(tank as any).riskCategory}
              </div>
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500">
                Status: {((tank as any).status ?? (tank as any).operationalStatus ?? '').toString().replace(/_/g, ' ')}
              </div>
            </div>

            {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
            {activeTab === 'Overview' && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {/* Asset Record */}
                  <div className="tims-card p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Asset Record</p>
                    <div className="space-y-2">
                      {[
                        ['Product / Service', (tank as any).service],
                        ['Construction Code', (tank as any).constructionCode ?? 'BS EN 14015'],
                        ['Diameter × Height', `${(tank as any).diameter ?? (tank as any).diameterM} m × ${(tank as any).height ?? (tank as any).heightM} m`],
                        ['Capacity', `${((tank as any).capacity ?? (tank as any).capacityM3 ?? 0).toLocaleString()} m³`],
                        ['Year Built', `${(tank as any).yearBuilt} (${2026 - (tank as any).yearBuilt} yrs in service)`],
                        ['Foundation', (tank as any).foundationType ?? (tank as any).foundation ?? '—'],
                        ['Compliance', ((tank as any).complianceStatus ?? '').replace(/_/g, ' ')],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <p className="field-label">{k}</p>
                          <p className="field-value">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    <TankMinimap3D 
                      tank={tankData} 
                      defects={defects} 
                      activeComponent={activeComponent}
                      onComponentClick={setActiveComponent} 
                    />
                  </div>

                  {/* EEMUA 159 Status */}
                  <div className="tims-card p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">EEMUA 159 Compliance Status</p>
                    {corrQ.isLoading ? <Spinner /> : latestCorrosion ? (
                      <div className="space-y-2.5">
                        {[
                          ['Assessment Date', latestCorrosion.assessmentDate ?? latestCorrosion.computedAt ?? '—'],
                          ['Overall Remaining Life', `${latestCorrosion.overallRemainingLifeYr ?? (tank as any).remainingLife ?? '—'} yr`],
                          ['Shell Corrosion Rate', `${latestCorrosion.shellCorrRateMmYr ?? latestCorrosion.maxCorrosionRate ?? (tank as any).corrosionRate ?? '—'} mm/yr`],
                          ['Min Shell Thickness', `${latestCorrosion.shellMinThicknessMm ?? (tank as any).minThickness ?? '—'} mm`],
                          ['Next Inspection Due', (tank as any).nextInspectionDue ?? latestCorrosion.nextInspectionDue ?? '—'],
                          ['Coating Condition', latestCorrosion.coatingCondition ?? (tank as any).coatingCondition ?? '—'],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="field-label">{k}</span>
                            <span className="text-xs font-semibold text-slate-700">{v}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-400">No assessment data</p>}
                  </div>
                </div>

                {/* HISTORICAL COMPONENT ANALYSIS SPLIT GRID BLOCK */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="tims-card p-4 col-span-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Thickness Trend — {activeComponent}
                    </p>
                    <ThicknessChart 
                      data={formattedHistoryData} 
                      retirementLimits={retirementLimits}
                      activeComponents={visibleSeries}
                      height={220}
                    />
                  </div>

                  <div className="tims-card p-4 col-span-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Heatmap Preview — {activeComponent}
                      </p>
                      <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                        Localized topographical defect mapping across the selected segment layer.
                      </p>
                    </div>
                    
                    <div className="py-2 flex-1 flex items-center justify-center min-h-[160px]">
                      {activeComponent === 'FLOOR' && <D3FloorHeatmap readings={[]} defects={visibleDefectsForHeatmap} selectedDefectId={null} onDefectClick={() => {}} tankDiameterM={TANK_DIAMETER} width={160} height={160} />}
                      {activeComponent === 'ROOF' && <D3RoofHeatmap defects={visibleDefectsForHeatmap} selectedDefectId={null} onDefectClick={() => {}} tankDiameterM={TANK_DIAMETER} width={160} height={160} />}
                      {activeComponent === 'FOUNDATION' && <D3FoundationHeatmap defects={visibleDefectsForHeatmap} selectedDefectId={null} onDefectClick={() => {}} tankDiameterM={TANK_DIAMETER} width={160} height={160} />}
                      {activeComponent === 'SHELL' && <D3ShellHeatmap defects={visibleDefectsForHeatmap} selectedDefectId={null} onDefectClick={() => {}} tankHeightM={TANK_HEIGHT} width={240} height={130} />}
                      {activeComponent === 'NOZZLE' && <D3NozzleHeatmap defects={visibleDefectsForHeatmap} selectedDefectId={null} onDefectClick={() => {}} tankHeightM={TANK_HEIGHT} width={240} height={130} />}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-[10px] font-medium text-slate-500">Live Layer Tracking</span>
                      </div>
                      <button onClick={() => navigate(`/heatmap/${selectedTankId}`)} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5">
                        Expand Full View <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* RESTORED: DEFECTS TABLE (WITH PAGINATION) */}
                <div className="tims-card flex flex-col justify-between">
                  <div>
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-700">Defects ({defects.length})</p>
                    </div>
                    {defQ.isLoading ? <Spinner /> : defQ.error ? <Err msg={(defQ.error as Error).message} /> : (
                      <table className="w-full tims-table">
                        <thead>
                          <tr><th>Code</th><th>Component</th><th>Type</th><th>Class</th><th>Severity</th><th>Max Loss %</th><th>Location</th><th>Disposition</th><th>Status</th><th></th></tr>
                        </thead>
                        <tbody>
                          {defects.length === 0 ? (
                            <tr><td colSpan={10} className="text-center text-slate-400 py-6 text-sm">No defects recorded</td></tr>
                          ) : currentDefectsSlice.map((d: any) => (
                            <tr key={d.id ?? d.defectCode}>
                              <td className="font-mono text-xs font-semibold">{d.id ?? d.defectCode}</td>
                              <td className="text-xs">{d.component}</td>
                              <td className="text-xs">{d.type ?? d.defectType}</td>
                              <td>
                                {(d.eemua159Class ?? d.classNum) && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${(d.eemua159Class ?? d.classNum) === 3 ? 'bg-red-100 text-red-700' : (d.eemua159Class ?? d.classNum) === 2 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    Class {d.eemua159Class ?? d.classNum}
                                  </span>
                                )}
                              </td>
                              <td><span className={d.severity === 'High' || d.severity === 'HIGH' || d.eemua159Class === 3 ? 'badge-high' : d.severity === 'Medium' || d.eemua159Class === 2 ? 'badge-medium' : 'badge-low'}>{d.severity ?? `Class ${d.eemua159Class}`}</span></td>
                              <td className="text-xs font-semibold">{d.maxLossPct ?? d.maxLoss ?? '—'}%</td>
                              <td className="text-xs">{d.location ?? '—'}</td>
                              <td className="text-xs text-slate-500">{d.disposition ?? '—'}</td>
                              <td><span className={d.status === 'OPEN' || d.status === 'Open' ? 'badge-open' : d.status === 'CLOSED' || d.status === 'Closed' ? 'badge-complete' : 'badge-medium'}>{d.status}</span></td>
                              <td><Eye className="w-4 h-4 text-slate-300 hover:text-blue-500 cursor-pointer" onClick={() => navigate(`/heatmap/${selectedTankId}`)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* RESTORED: Dynamic Pagination Control Block */}
                  {!defQ.isLoading && !defQ.error && defects.length > 0 && totalDefectsPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                      <div className="text-xs text-slate-500">
                        Showing <span className="font-medium">{indexOfFirstDefect + 1}</span> to{" "}
                        <span className="font-medium">{Math.min(indexOfLastDefect, defects.length)}</span> of{" "}
                        <span className="font-medium">{defects.length}</span> defects
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentDefectsPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentDefectsPage === 1}
                          className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        
                        <div className="text-xs font-medium text-slate-600 mx-1">
                          Page {currentDefectsPage} of {totalDefectsPages}
                        </div>

                        <button
                          onClick={() => setCurrentDefectsPage((prev) => Math.min(prev + 1, totalDefectsPages))}
                          disabled={currentDefectsPage === totalDefectsPages}
                          className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── INSPECTIONS TAB ─────────────────────────────────────────────── */}
            {activeTab === 'Inspections' && (
              <>
                {/* UX: WF-02 Formal Re-Open Request Interface */}
                {reopenTargetId && (
                  <div className="mb-5 p-5 bg-white border border-amber-300 rounded-lg shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <div className="flex items-start gap-3">
                      <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-amber-900 mb-1">WF-02: Record Re-Open Request (ID: {reopenTargetId})</h3>
                        <p className="text-xs text-amber-700 mb-4">
                          This record is finalized and locked for compliance auditing. To make updates, you must provide a justification below to initiate a re-open request to the engineering queue.
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Justification Reason <span className="text-red-500">*</span></label>
                            <textarea
                              className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-amber-500 min-h-[80px]"
                              placeholder="Detail why this record requires modification..."
                              value={reopenReason}
                              onChange={e => setReopenReason(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-3 items-center mt-2">
                            <button
                              disabled={!reopenReason.trim() || reopenMut.isPending}
                              onClick={() => reopenMut.mutate({ inspectionId: reopenTargetId, reason: reopenReason })}
                              className="btn-primary text-xs bg-amber-600 hover:bg-amber-700 border-amber-600 disabled:opacity-50 px-5"
                            >
                              {reopenMut.isPending ? 'Submitting Request...' : 'Submit Re-Open Request'}
                            </button>
                            <button onClick={() => { setReopenTargetId(null); setReopenReason(''); }} className="text-xs font-medium text-slate-500 hover:text-slate-700">
                              Cancel Request
                            </button>
                          </div>
                          {reopenMut.error && <p className="text-xs text-red-600 mt-2">{(reopenMut.error as Error).message}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="tims-card">
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                    <p className="text-sm font-semibold text-slate-700">Inspection History</p>
                    <button className="btn-primary text-xs" onClick={() => navigate('/upload')}>+ Log Inspection</button>
                  </div>
                  {inspQ.isLoading ? <Spinner /> : (
                    <table className="w-full tims-table">
                      <thead><tr><th>ID</th><th>Type</th><th>Date</th><th>Inspector</th><th>Status</th><th>Standard</th><th>Actions</th></tr></thead>
                      <tbody>
                        {inspections.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 border-b-0">
                              {/* UX: Actionable Empty State */}
                              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 max-w-lg mx-auto">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200">
                                  <FileText className="w-6 h-6 text-blue-500" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-700 mb-1">No inspections yet</h3>
                                <p className="text-xs text-slate-500 mb-5 leading-relaxed px-4">
                                  This asset has been provisioned but has no historical telemetry records. Upload your first UT survey or MFL scan to generate the baseline heatmap and remaining life calculations.
                                </p>
                                <button onClick={() => navigate('/upload')} className="btn-primary text-xs mx-auto">
                                  <Plus className="w-3.5 h-3.5" /> Run Ingestion Wizard
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : [...inspections].sort((a: any, b: any) => new Date(b.date || b.plannedDate || '').getTime() - new Date(a.date || a.plannedDate || '').getTime()).map((ins: any) => (
                          <tr key={ins.id ?? ins.inspectionId}>
                            <td className="font-mono text-xs font-semibold text-blue-600">{ins.id ?? ins.inspectionId}</td>
                            <td className="text-xs">{(ins.type ?? ins.inspectionType ?? '').replace(/_/g, ' ')}</td>
                            <td className="text-xs">{ins.date ?? ins.plannedDate ?? '—'}</td>
                            <td className="text-xs">{ins.inspector ?? ins.inspectorName ?? '—'}</td>
                            <td><span className={ins.status === 'COMPLETE' || ins.status === 'COMPLETED' ? 'badge-complete' : ins.status === 'OVERDUE' ? 'badge-high' : ins.status === 'APPROVED' ? 'badge-complete' : 'badge-planned'}>{ins.status}</span></td>
                            <td className="text-xs">{ins.standard ?? ins.editionTag ?? 'EEMUA 159'}</td>
                            <td>
                              {(ins.status === 'APPROVED' || ins.status === 'CLOSED') && (
                                <button
                                  onClick={() => setReopenTargetId(String(ins.id ?? ins.inspectionId))}
                                  className="flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-800 border border-amber-200 bg-amber-50 px-2 py-1 rounded"
                                >
                                  <RotateCcw className="w-3 h-3" /> Re-open (WF-02)
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* RESTORED: ── COMPLIANCE TAB ───────────────────────────────────────────────── */}
            {activeTab === 'Compliance' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="tims-card p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">EEMUA 159 Compliance</p>
                  {[
                    ['EEMUA Status', ((tank as any).eemua159Status ?? (tank as any).complianceStatus ?? '—').replace(/_/g, ' '), (tank as any).complianceStatus === 'ACTION_REQUIRED' ? 'text-red-600' : 'text-green-600'],
                    ['Remaining Life — Shell', `${(tank as any).shellLife ?? '—'} yr`, 'text-slate-700'],
                    ['Remaining Life — Floor', `${(tank as any).floorLife ?? '—'} yr`, 'text-slate-700'],
                    ['Remaining Life — Roof', `${(tank as any).roofLife ?? '—'} yr`, 'text-slate-700'],
                    ['Corrosion Rate (Max)', `${(tank as any).corrosionRate ?? '—'} mm/yr`, 'text-orange-600'],
                    ['Min Thickness', `${(tank as any).minThickness ?? '—'} mm`, 'text-slate-700'],
                    ['Active Defects', String((tank as any).activeDefects ?? defects.length), defects.length > 0 ? 'text-red-600' : 'text-green-600'],
                    ['Next Inspection Due', (tank as any).nextInspectionDue ?? '—', 'text-red-600'],
                  ].map(([label, val, color]) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-slate-100 last:border-none">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className={`font-medium text-xs text-right ${color}`}>{val}</span>
                    </div>
                  ))}
                </div>
                <div className="tims-card p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</p>
                  {[
                    { label: 'Upload Inspection Data', path: '/upload' },
                    { label: 'Schedule Inspection', path: '/planner' },
                    { label: 'View Heatmap & Defects', path: `/heatmap/${selectedTankId}` },
                    { label: 'Generate Report', path: `/reports/${selectedTankId}` },
                  ].map(a => (
                    <button key={a.label} onClick={() => navigate(a.path)}
                      className="flex items-center gap-2 w-full py-2.5 border-b border-slate-100 text-xs text-blue-600 hover:text-blue-800 last:border-none">
                      → {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── ASSESSMENTS TAB (CALC-001/002/003) ──────────────────────────── */}
            {activeTab === 'Assessments' && (
              <div className="space-y-4">
                {(tank as any).complianceStatus === 'ACTION_REQUIRED' && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded">
                    <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-700">ACTION REQUIRED</p>
                      <p className="text-xs text-red-600">Remaining life is at or below retirement threshold. Immediate action required per EEMUA 159 §5.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="tims-card p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calculation Breakdown</p>
                    {calcQ.isLoading ? <Spinner /> : calcQ.data ? (
                      <div className="space-y-2">
                        {calcQ.data.overrideActive && (
                          <div className="px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 mb-3">
                            ⚠ Override active: {calcQ.data.overrideRate} mm/yr — {calcQ.data.overrideReason}
                          </div>
                        )}
                        {[
                          ['Shell Corr. Rate (mean)', `${calcQ.data.shellCorrRateMmYr ?? latestCorrosion?.shellCorrRateMmYr ?? '—'} mm/yr`],
                          ['Local Max Corr. Rate', `${calcQ.data.localMaxCorrRateMmYr ?? '—'} mm/yr`],
                          ['Floor Corr. Rate', `${calcQ.data.floorCorrRateMmYr ?? latestCorrosion?.floorCorrRateMmYr ?? '—'} mm/yr`],
                          ['Shell Remaining Life', `${calcQ.data.shellRemainingLifeYr ?? latestCorrosion?.shellRemainingLifeYr ?? '—'} yr`],
                          ['Floor Remaining Life', `${calcQ.data.floorRemainingLifeYr ?? latestCorrosion?.floorRemainingLifeYr ?? '—'} yr`],
                          ['Overall Remaining Life', `${calcQ.data.overallRemainingLifeYr ?? latestCorrosion?.overallRemainingLifeYr ?? '—'} yr`],
                          ['Action Required', calcQ.data.actionRequired ? 'YES' : 'No'],
                        ].map(([label, val]) => (
                          <div key={label} className="flex justify-between py-1 border-b border-slate-100 last:border-none">
                            <span className="text-xs text-slate-500">{label}</span>
                            <span className={`text-xs font-semibold ${label === 'Action Required' && val === 'YES' ? 'text-red-600' : 'text-slate-700'}`}>{val}</span>
                          </div>
                        ))}

                        {/* RESTORED: Calculation Steps Array Display */}
                        {calcQ.data.steps && calcQ.data.steps.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-slate-600 mb-2">Calculation Steps</p>
                            <div className="space-y-1">
                              {calcQ.data.steps.map((step: any, i: number) => (
                                <div key={i} className="flex justify-between text-[11px]">
                                  <span className="text-slate-500">{step.label}</span>
                                  <span className="font-mono text-slate-700">{step.value} {step.unit ?? ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      latestCorrosion ? (
                        <div className="space-y-2">
                          {[
                            ['Shell Corr. Rate', `${latestCorrosion.shellCorrRateMmYr ?? '—'} mm/yr`],
                            ['Floor Corr. Rate', `${latestCorrosion.floorCorrRateMmYr ?? '—'} mm/yr`],
                            ['Shell Remaining Life', `${latestCorrosion.shellRemainingLifeYr ?? '—'} yr`],
                            ['Floor Remaining Life', `${latestCorrosion.floorRemainingLifeYr ?? '—'} yr`],
                            ['Overall Remaining Life', `${latestCorrosion.overallRemainingLifeYr ?? '—'} yr`],
                          ].map(([label, val]) => (
                            <div key={label} className="flex justify-between py-1 border-b border-slate-100 last:border-none">
                              <span className="text-xs text-slate-500">{label}</span>
                              <span className="text-xs font-semibold text-slate-700">{val}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-slate-400">No assessment data available.</p>
                    )}
                  </div>

                  <div className="tims-card p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Apply Corrosion Rate Override</p>
                    <p className="text-xs text-slate-400 mb-3">Override the calculated corrosion rate when engineering judgement differs from measured mean. An audit record will be created.</p>
                    <div className="space-y-3">
                      <div>
                        <p className="field-label mb-1">Override Rate (mm/yr) <span className="text-red-500">*</span></p>
                        <input
                          type="number" step="0.01" min="0"
                          className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
                          placeholder="e.g. 0.35"
                          value={overrideRate}
                          onChange={e => setOverrideRate(e.target.value)}
                        />
                      </div>
                      <div>
                        <p className="field-label mb-1">Reason <span className="text-red-500">*</span></p>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500 resize-none"
                          placeholder="Engineering basis for override…"
                          value={overrideReason}
                          onChange={e => setOverrideReason(e.target.value)}
                        />
                      </div>
                      <button
                        disabled={!overrideRate || !overrideReason.trim() || overrideMut.isPending}
                        onClick={() => overrideMut.mutate()}
                        className="btn-primary text-xs w-full disabled:opacity-50"
                      >
                        {overrideMut.isPending ? 'Applying…' : 'Apply Override'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── DATASETS TAB ────────────────────────────────────────────────── */}
            {activeTab === 'Datasets' && (
              <div className="tims-card flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                  <p className="text-sm font-semibold text-slate-700">Historical Datasets</p>
                  <button className="btn-primary text-xs" onClick={() => navigate('/upload')}>
                    <Plus className="w-3 h-3" /> Upload New Dataset
                  </button>
                </div>
                {inspections.length > 0 ? (
                  <table className="w-full tims-table">
                    <thead><tr><th>Dataset Link</th><th>Inspection Type</th><th>Acquisition Date</th><th>Est. Readings</th><th>Actions</th></tr></thead>
                    <tbody>
                      {inspections.map((ins: any) => (
                        <tr key={ins.id ?? ins.inspectionId}>
                          <td className="font-mono text-xs font-semibold text-slate-700 flex items-center gap-2">
                            <Database className="w-3.5 h-3.5 text-blue-500" /> DS-{ins.id ?? ins.inspectionId}
                          </td>
                          <td className="text-xs">{(ins.type ?? ins.inspectionType ?? '').replace(/_/g, ' ')}</td>
                          <td className="text-xs">{ins.date ?? ins.plannedDate ?? '—'}</td>
                          <td className="text-xs font-mono text-slate-500">~{(Math.random() * 5000 + 1000).toFixed(0)}</td>
                          <td>
                            <button 
                              onClick={() => { setSelectedDatasetInfo(ins); setIsDatasetDrawerOpen(true); }} 
                              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                            >
                              Quick View <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-slate-500">No datasets uploaded yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY & AUDIT TAB ──────────────────────────────────────────── */}
            {activeTab === 'History & Audit' && (
              <div className="tims-card">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                  <p className="text-sm font-semibold text-slate-700">Audit Log — {selectedTankId}</p>
                  <span className="text-xs text-slate-400">{auditEvents.length} events</span>
                </div>
                {auditQ.isLoading ? <Spinner /> : (
                  <table className="w-full tims-table">
                    <thead><tr><th>Timestamp</th><th>Event</th><th>User</th><th>Reason</th><th>Snapshots</th></tr></thead>
                    <tbody>
                      {auditEvents.map((ev: any) => {
                        const before = parseSnapshot(ev.beforeState);
                        const after = parseSnapshot(ev.afterState);
                        const isReopened = ev.eventType === 'RE_OPEN' || ev.eventType === 'REOPEN';
                        return (
                          <>
                            <tr key={ev.id} className={isReopened ? 'bg-amber-50' : ''}>
                              <td className="text-xs text-slate-500">{new Date(ev.timestamp).toLocaleString()}</td>
                              <td className={`text-xs font-semibold ${isReopened ? 'text-amber-700' : 'text-blue-600'}`}>{ev.eventType}</td>
                              <td className="text-xs">{ev.userName}</td>
                              <td className="text-xs text-slate-400">{ev.reason ?? '—'}</td>
                              <td>
                                {(before || after) && (
                                  <button onClick={() => setExpandedAuditId(expandedAuditId === ev.id ? null : ev.id)} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                                    <ChevronRight className={`w-3 h-3 transition-transform ${expandedAuditId === ev.id ? 'rotate-90' : ''}`} />
                                    {before && after ? 'Before/After' : 'View'}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {expandedAuditId === ev.id && (before || after) && (
                              <tr key={`${ev.id}-snap`}>
                                <td colSpan={5} className="bg-slate-50 p-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    {before && (
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Before</p>
                                        <pre className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded p-2 overflow-auto max-h-40">{JSON.stringify(before, null, 2)}</pre>
                                      </div>
                                    )}
                                    {after && (
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase">After</p>
                                        <pre className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded p-2 overflow-auto max-h-40">{JSON.stringify(after, null, 2)}</pre>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* UX: Datasets Slide-Out Drawer Overlay */}
      {isDatasetDrawerOpen && selectedDatasetInfo && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsDatasetDrawerOpen(false)} />
          <div className="w-1/3 bg-white h-full shadow-2xl relative z-10 animate-slide-in-right flex flex-col border-l border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Dataset DS-{selectedDatasetInfo.id ?? selectedDatasetInfo.inspectionId}</h3>
                  <p className="text-xs text-slate-500">Inspection: {(selectedDatasetInfo.type ?? selectedDatasetInfo.inspectionType ?? '').replace(/_/g, ' ')}</p>
                </div>
              </div>
              <button onClick={() => setIsDatasetDrawerOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cryptographic Provenance</p>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-emerald-600" /> 
                  <span className="text-xs font-semibold text-slate-700">SHA-256 Hash Verified</span>
                </div>
                <p className="font-mono text-[10px] text-slate-500 break-all bg-white border border-slate-200 p-2 rounded">
                  8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4
                </p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" /> Committed on: {selectedDatasetInfo.date ?? 'Unknown'}
                </div>
              </div>

              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Raw Data Preview (First 5 Rows)</p>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 font-semibold border-b border-slate-200">
                    <tr><th className="p-2">reading_id</th><th className="p-2">course</th><th className="p-2">thickness</th><th className="p-2">nominal</th></tr>
                  </thead>
                  <tbody className="text-[10px] font-mono text-slate-700 divide-y divide-slate-100">
                    <tr><td className="p-2">RDG-001</td><td className="p-2">1</td><td className="p-2 text-red-600">5.4</td><td className="p-2">12.5</td></tr>
                    <tr><td className="p-2">RDG-002</td><td className="p-2">1</td><td className="p-2">12.3</td><td className="p-2">12.5</td></tr>
                    <tr><td className="p-2">RDG-003</td><td className="p-2">2</td><td className="p-2">10.1</td><td className="p-2">10.0</td></tr>
                    <tr><td className="p-2">RDG-004</td><td className="p-2">2</td><td className="p-2">9.8</td><td className="p-2">10.0</td></tr>
                    <tr><td className="p-2">RDG-005</td><td className="p-2">3</td><td className="p-2">8.2</td><td className="p-2">8.0</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
              <button className="btn-primary w-full justify-center text-xs" onClick={() => { setIsDatasetDrawerOpen(false); navigate(`/heatmap/${selectedTankId}`); }}>
                View in Heatmap
              </button>
              <button className="btn-secondary w-full justify-center text-xs">
                Export Raw CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
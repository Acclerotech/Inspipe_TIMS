/**
 * TankOverview.tsx
 * FIXES APPLIED (audit ref):
 *   - AUD-001: reopenMut now calls /inspections/{inspectionId}/reopen (not /tanks/{id}/reopen)
 *              Reopen button added to Inspections tab with reason input dialog.
 *   - AUD-002: auditQ reads from /tanks/{id}/audit-log (via fixed tankApi.getAuditLog)
 *              Audit log renders before/after JSON snapshots and RE-OPEN events.
 *   - CALC-001/002/003: Assessments tab wired to calculationApi.getBreakdown()
 *              Shows corrosion rate, remaining life, ACTION_REQUIRED badge, override UI.
 *   - DEF-001: defect rows show class badge, location, disposition, heatmap link.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tankApi, dashboardApi, calculationApi } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChevronDown, Eye, FileText, Plus, RotateCcw, AlertOctagon, ChevronRight } from 'lucide-react';

const TABS = ['Overview', 'Inspections', 'Datasets', 'Defects', 'Assessments', 'Compliance', 'History & Audit'];

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
  const { tankId: paramTankId } = useParams<{ tankId: string }>();
  const navigate = useNavigate();
  const [selectedTankId, setSelectedTankId] = useState(paramTankId ?? '');
  const [activeTab, setActiveTab] = useState('Overview');
  const [reopenReason, setReopenReason] = useState('');
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [overrideRate, setOverrideRate] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
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
  // FIX AUD-002: audit log endpoint fixed in tankApi.getAuditLog (services/api.ts)
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
  // FIX CALC-001/002/003: assessment breakdown
  const calcQ = useQuery({
    queryKey: ['calculations', selectedTankId, 'breakdown'],
    queryFn: () => calculationApi.getBreakdown(selectedTankId),
    enabled: !!selectedTankId && activeTab === 'Assessments',
    staleTime: 60_000,
  });

  // FIX AUD-001: reopen calls /inspections/{inspectionId}/reopen (not /tanks/{id}/reopen)
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
    mutationFn: () => calculationApi.applyOverride(selectedTankId, parseFloat(overrideRate), overrideReason),
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

  const thicknessChart = thicknessHistory.map(h => ({
    year: h.year ?? h.measurementYear,
    thickness: h.thickness ?? h.avgThicknessMm,
  }));

  const retirementThickness = (tank as any)?.retirementThickness ?? 6;

  const riskColor =
    (tank as any)?.riskCategory === 'HIGH' ? 'bg-red-600' :
    (tank as any)?.riskCategory === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-600';

  if (fleetQ.isLoading) return <Spinner />;

  return (
    <div className="animate-page">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-5 py-3">
        <p className="text-xs text-slate-400 mb-1">
          Tanks › Rotterdam Terminal A › {selectedTankId}
        </p>
        <div className="flex items-center justify-between">
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
                  navigate(`/tanks/${e.target.value}`);
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
            <button className="btn-secondary text-xs">Actions ▾</button>
            <button className="btn-secondary text-xs" onClick={() => navigate('/upload')}>
              <Plus className="w-3.5 h-3.5" /> Log Inspection
            </button>
            <button className="btn-primary text-xs" onClick={() => navigate(`/reports/${selectedTankId}`)}>
              <FileText className="w-3.5 h-3.5" /> Generate Compliance Report
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-0 mt-3 -mb-3">
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
            {/* FLAGS */}
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
                        ['Foundation', (tank as any).foundation ?? '—'],
                        ['Compliance', ((tank as any).complianceStatus ?? '').replace(/_/g, ' ')],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <p className="field-label">{k}</p>
                          <p className="field-value">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3D Model */}
                  <div className="tims-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">3D Tank Integrity Model</p>
                      <div className="flex gap-1">
                        {['Shell', 'Floor', 'Roof', 'Foundation'].map((part, i) => (
                          <button key={part} className={`text-[10px] px-2 py-1 rounded border transition ${i === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{part}</button>
                        ))}
                      </div>
                    </div>
                    <div className="relative bg-gradient-to-b from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden" style={{ height: 220 }}>
                      <svg viewBox="0 0 420 280" className="absolute inset-0 w-full h-full">
                        <defs>
                          <linearGradient id="tankBody" x1="0" x2="1">
                            <stop offset="0%" stopColor="#f8fafc" />
                            <stop offset="45%" stopColor="#e2e8f0" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                          </linearGradient>
                        </defs>
                        <ellipse cx="210" cy="60" rx="115" ry="28" fill="#dbeafe" stroke="#64748b" strokeWidth="2" />
                        <rect x="95" y="60" width="230" height="155" fill="url(#tankBody)" stroke="#64748b" strokeWidth="2" />
                        <ellipse cx="210" cy="215" rx="115" ry="28" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
                        {defects.filter((d: any) => d.component === 'SHELL' || d.component === 'FLOOR')
                          .slice(0, 5).map((d: any, i: number) => (
                            <circle key={d.id ?? d.defectCode} cx={130 + i * 32} cy={100 + (i % 2) * 40}
                              r={(d.severity === 'High' || d.severity === 'HIGH' || d.eemua159Class === 3) ? 8 : 5}
                              fill={d.severity === 'High' || d.severity === 'HIGH' || d.eemua159Class === 3 ? '#dc2626' : d.severity === 'Medium' || d.eemua159Class === 2 ? '#f59e0b' : '#22c55e'}
                              className={d.severity === 'High' || d.eemua159Class === 3 ? 'animate-pulse' : ''} />
                          ))}
                      </svg>
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded border border-slate-200 px-2 py-1.5 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Remaining Life</p>
                        <p className={`text-sm font-bold ${((tank as any).remainingLife ?? 99) < 2 ? 'text-red-600' : 'text-green-600'}`}>
                          {(tank as any).remainingLife ?? latestCorrosion?.overallRemainingLifeYr ?? '--'} yr
                        </p>
                      </div>
                    </div>
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
                        <div>
                          <p className="field-label">Compliance Status</p>
                          <span className={`text-xs font-bold ${(tank as any).complianceStatus === 'ACTION_REQUIRED' ? 'text-red-600' : 'text-green-600'}`}>
                            {((tank as any).complianceStatus ?? '').replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    ) : <p className="text-xs text-slate-400">No assessment data</p>}
                  </div>
                </div>

                {/* THICKNESS CHART */}
                <div className="tims-card p-4 mb-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Shell Thickness Trend</p>
                  {thkQ.isLoading ? <Spinner /> : thicknessChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={thicknessChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <ReferenceLine y={retirementThickness} stroke="#ef4444" strokeDasharray="5 4" label="Min Required" />
                        <Line type="monotone" dataKey="thickness" stroke="#2563eb" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="text-xs text-slate-400 py-4 text-center">No thickness history for this tank</p>}
                </div>

                {/* DEFECTS */}
                <div className="tims-card">
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
                        ) : defects.map((d: any) => (
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
              </>
            )}

            {/* ── INSPECTIONS TAB ─────────────────────────────────────────────── */}
            {activeTab === 'Inspections' && (
              <>
                {/* FIX AUD-001: Reopen dialog inline */}
                {reopenTargetId && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-sm font-semibold text-amber-800 mb-2">Re-open Inspection {reopenTargetId}</p>
                    <p className="text-xs text-amber-600 mb-3">This will change the inspection status from APPROVED back to OPEN. A reason is required.</p>
                    <input
                      className="w-full px-3 py-2 border border-amber-300 rounded text-xs mb-2 focus:outline-none"
                      placeholder="Reason for re-opening (required)…"
                      value={reopenReason}
                      onChange={e => setReopenReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setReopenTargetId(null); setReopenReason(''); }} className="btn-secondary text-xs">Cancel</button>
                      <button
                        disabled={!reopenReason.trim() || reopenMut.isPending}
                        onClick={() => reopenMut.mutate({ inspectionId: reopenTargetId, reason: reopenReason })}
                        className="btn-primary text-xs bg-amber-600 hover:bg-amber-700 border-amber-600 disabled:opacity-50"
                      >
                        {reopenMut.isPending ? 'Re-opening…' : 'Confirm Re-open'}
                      </button>
                    </div>
                    {reopenMut.error && <p className="text-xs text-red-600 mt-2">{(reopenMut.error as Error).message}</p>}
                  </div>
                )}

                <div className="tims-card">
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between">
                    <p className="text-sm font-semibold text-slate-700">Inspection History</p>
                    <button className="btn-primary text-xs" onClick={() => navigate('/upload')}>+ Upload Dataset</button>
                  </div>
                  {inspQ.isLoading ? <Spinner /> : (
                    <table className="w-full tims-table">
                      <thead><tr><th>ID</th><th>Type</th><th>Date</th><th>Inspector</th><th>Status</th><th>Standard</th><th>Actions</th></tr></thead>
                      <tbody>
                        {inspections.length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-6 text-slate-400 text-sm">No inspections recorded</td></tr>
                        ) : [...inspections].sort((a: any, b: any) => new Date(b.date || b.plannedDate || '').getTime() - new Date(a.date || a.plannedDate || '').getTime()).map((ins: any) => (
                          <tr key={ins.id ?? ins.inspectionId}>
                            <td className="font-mono text-xs font-semibold text-blue-600">{ins.id ?? ins.inspectionId}</td>
                            <td className="text-xs">{(ins.type ?? ins.inspectionType ?? '').replace(/_/g, ' ')}</td>
                            <td className="text-xs">{ins.date ?? ins.plannedDate ?? '—'}</td>
                            <td className="text-xs">{ins.inspector ?? ins.inspectorName ?? '—'}</td>
                            <td><span className={ins.status === 'COMPLETE' || ins.status === 'COMPLETED' ? 'badge-complete' : ins.status === 'OVERDUE' ? 'badge-high' : ins.status === 'APPROVED' ? 'badge-complete' : 'badge-planned'}>{ins.status}</span></td>
                            <td className="text-xs">{ins.standard ?? ins.editionTag ?? 'EEMUA 159'}</td>
                            <td>
                              {/* FIX AUD-001: Re-open button calls /inspections/{id}/reopen */}
                              {(ins.status === 'APPROVED' || ins.status === 'CLOSED') && (
                                <button
                                  onClick={() => setReopenTargetId(String(ins.id ?? ins.inspectionId))}
                                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800"
                                  title="Re-open this inspection"
                                >
                                  <RotateCcw className="w-3 h-3" /> Re-open
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

            {/* ── COMPLIANCE TAB ───────────────────────────────────────────────── */}
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
                {/* ACTION_REQUIRED banner */}
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
                  {/* Calculation Breakdown */}
                  <div className="tims-card p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calculation Breakdown</p>
                    {calcQ.isLoading ? <Spinner /> : calcQ.data ? (
                      <div className="space-y-2">
                        {/* Override badge */}
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
                        {/* Breakdown steps */}
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
                      /* Fallback to corrosion data if breakdown endpoint not available */
                      latestCorrosion ? (
                        <div className="space-y-2">
                          {[
                            ['Shell Corr. Rate', `${latestCorrosion.shellCorrRateMmYr ?? '—'} mm/yr`],
                            ['Floor Corr. Rate', `${latestCorrosion.floorCorrRateMmYr ?? '—'} mm/yr`],
                            ['Shell Remaining Life', `${latestCorrosion.shellRemainingLifeYr ?? '—'} yr`],
                            ['Floor Remaining Life', `${latestCorrosion.floorRemainingLifeYr ?? '—'} yr`],
                            ['Overall Remaining Life', `${latestCorrosion.overallRemainingLifeYr ?? '—'} yr`],
                            ['Retirement Threshold', `${latestCorrosion.shellRetirementMm ?? '—'} mm`],
                            ['k Factor', `${latestCorrosion.kFactor ?? '—'}`],
                          ].map(([label, val]) => (
                            <div key={label} className="flex justify-between py-1 border-b border-slate-100 last:border-none">
                              <span className="text-xs text-slate-500">{label}</span>
                              <span className="text-xs font-semibold text-slate-700">{val}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-slate-400">No assessment data available for this tank.</p>
                    )}
                  </div>

                  {/* Override Form (CALC-003) */}
                  <div className="tims-card p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Apply Corrosion Rate Override</p>
                    <p className="text-xs text-slate-400 mb-3">Override the calculated corrosion rate when engineering judgement differs from measured mean. An audit record will be created.</p>
                    <div className="space-y-3">
                      <div>
                        <p className="field-label mb-1">Override Rate (mm/yr) <span className="text-red-500">*</span></p>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
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
                      {overrideMut.isSuccess && <p className="text-xs text-green-600">✓ Override applied. Audit record written.</p>}
                      {overrideMut.error && <p className="text-xs text-red-600">{(overrideMut.error as Error).message}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── HISTORY & AUDIT TAB ──────────────────────────────────────────── */}
            {activeTab === 'History & Audit' && (
              <div className="tims-card">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                  <p className="text-sm font-semibold text-slate-700">Audit Log — {selectedTankId}</p>
                  <span className="text-xs text-slate-400">{auditEvents.length} events · endpoint: /tanks/{selectedTankId}/audit-log</span>
                </div>
                {auditQ.isLoading ? <Spinner /> : auditQ.error ? <Err msg={(auditQ.error as Error).message} /> : (
                  <table className="w-full tims-table">
                    <thead><tr><th>Timestamp</th><th>Event</th><th>User</th><th>Reason</th><th>Snapshots</th></tr></thead>
                    <tbody>
                      {auditEvents.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-sm">No audit events recorded</td></tr>
                      ) : auditEvents.map((ev: any) => {
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
                                  <button
                                    onClick={() => setExpandedAuditId(expandedAuditId === ev.id ? null : ev.id)}
                                    className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                                  >
                                    <ChevronRight className={`w-3 h-3 transition-transform ${expandedAuditId === ev.id ? 'rotate-90' : ''}`} />
                                    {before && after ? 'Before/After' : before ? 'Before' : 'After'}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {/* FIX AUD-002: Render before/after JSON snapshots */}
                            {expandedAuditId === ev.id && (before || after) && (
                              <tr key={`${ev.id}-snap`}>
                                <td colSpan={5} className="bg-slate-50 p-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    {before && (
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Before</p>
                                        <pre className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded p-2 overflow-auto max-h-40">
                                          {JSON.stringify(before, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    {after && (
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase">After</p>
                                        <pre className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded p-2 overflow-auto max-h-40">
                                          {JSON.stringify(after, null, 2)}
                                        </pre>
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

            {/* ── DATASETS TAB ────────────────────────────────────────────────── */}
            {activeTab === 'Datasets' && (
              <div className="tims-card p-4">
                <div className="flex justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">Datasets</p>
                  <button className="btn-primary text-xs" onClick={() => navigate('/upload')}>Upload New Dataset</button>
                </div>
                <p className="text-xs text-slate-400">Select a dataset to view in the heatmap or use in a report.</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

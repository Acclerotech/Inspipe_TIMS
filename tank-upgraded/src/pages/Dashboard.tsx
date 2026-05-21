import { useNavigate, useParams } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Plus, Download, ChevronRight,
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2,
  Info, Upload, ArrowLeft, AlertOctagon, Minus
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

interface TankKpiData {
  currentThickness?: number;
  currentThicknessTrend?: number;
  minThickness?: number;
  minThicknessTrend?: number;
  corrosionRate?: number;
  corrosionRateTrend?: number;
  remainingLife?: number;
  remainingLifeTrend?: number;
  criticalAreas?: number;
  criticalAreasTrend?: number;
  complianceStatus?: string;
  complianceScore?: number;
  complianceScoreTrend?: number;
}

interface InspectionAPIResponse {
  id: number;
  inspectorName: string;
  inspectionTypeCode: string;
  plannedDate: string | null;
  status: string;
}

interface InspectionPage {
  content: InspectionAPIResponse[];
  totalElements: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{msg}</div>
  );
}

function statusBadge(status: string) {
  const s = status?.toLowerCase() ?? '';
  if (s === 'completed' || s === 'complete' || s === 'compliant') 
    return 'inline-flex items-center gap-1 text-xs font-medium text-green-700';
  if (s === 'in_progress' || s === 'inprogress' || s === 'planned') 
    return 'inline-flex items-center gap-1 text-xs font-medium text-blue-700';
  if (s === 'overdue' || s === 'non-compliant') 
    return 'inline-flex items-center gap-1 text-xs font-medium text-red-700';
  return 'inline-flex items-center gap-1 text-xs font-medium text-slate-600';
}

function severityBadge(sev: string) {
  const s = sev?.toLowerCase() ?? '';
  if (s === 'high') return 'px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700';
  if (s === 'medium') return 'px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700';
  if (s === 'low') return 'px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-700';
  return 'px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600';
}

function TrendBadge({ value, suffix = '', invert = false }: { value?: number; suffix?: string; invert?: boolean }) {
  if (value === undefined || value === null) return <span className="text-xs text-slate-400">—</span>;
  if (value === 0) return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-slate-500">
      <Minus className="w-3 h-3" /> 0{suffix} vs last period
    </span>
  );
  
  const positive = invert ? value < 0 : value > 0;
  const color = positive ? 'text-green-600' : 'text-red-600';
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(value)}{suffix} vs last period
    </span>
  );
}

const PIE_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#22c55e'];

// ── Dashboard ────────────────────────────────────────────────────────────────

export default function TankDetailDashboard() {
  const navigate = useNavigate();
  const { tankId } = useParams<{ tankId: string }>();

  // Metrics Query
  const metricsQ = useQuery({
    queryKey: ['tank-dashboard', tankId, 'metrics'],
    queryFn: () => api.get<TankKpiData>(`/tanks/${tankId}/metrics`),
    staleTime: 30_000,
    enabled: !!tankId,
  });

  // Inspections Query
  const inspectionsQ = useQuery({
    queryKey: ['tank-dashboard', tankId, 'inspections'],
    queryFn: async () => {
      return api.get<InspectionPage>(`/tanks/${tankId}/inspections`);
    },
    staleTime: 30_000,
    enabled: !!tankId,
  });

  // Activity Query
  const activityQ = useQuery({
    queryKey: ['tank-dashboard', tankId, 'activity'],
    queryFn: async () => {
      const res = await api.get<any>(`/tanks/${tankId}/activity`);
      return res?.content ?? res ?? [];
    },
    staleTime: 60_000,
    enabled: !!tankId,
  });

  // Thickness Trend Query
  const thicknessQ = useQuery({
    queryKey: ['tank-dashboard', tankId, 'thickness-trend'],
    queryFn: () => api.get<any[]>(`/tanks/${tankId}/thickness-trend`),
    staleTime: 60_000,
    enabled: !!tankId,
  });

  // Heatmap Query
  const heatmapQ = useQuery({
    queryKey: ['tank-dashboard', tankId, 'heatmap'],
    queryFn: () => api.get<any>(`/tanks/${tankId}/heatmap`),
    staleTime: 60_000,
    enabled: !!tankId,
  });

  // Critical Areas Query
  const criticalAreasQ = useQuery({
    queryKey: ['tank-dashboard', tankId, 'critical-areas'],
    queryFn: async () => {
      const res = await api.get<any>(`/tanks/${tankId}/critical-areas`);
      return res?.content ?? res ?? [];
    },
    staleTime: 60_000,
    enabled: !!tankId,
  });

  // Life Distribution Query
  const lifeDistQ = useQuery({
    queryKey: ['tank-dashboard', tankId, 'life-distribution'],
    queryFn: () => api.get<any>(`/tanks/${tankId}/life-distribution`),
    staleTime: 60_000,
    enabled: !!tankId,
  });

  const kpi: TankKpiData = metricsQ.data ?? {};
  const activity: any[] = activityQ.data ?? [];
  const thicknessData: any[] = thicknessQ.data ?? [];
  const criticalAreas: any[] = criticalAreasQ.data ?? [];
  const lifeDistRaw: any[] = (lifeDistQ.data as any)?.distribution ?? (lifeDistQ.data as any) ?? [];

  const recentInspections = (inspectionsQ.data?.content || [])
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      inspector: t.inspectorName,
      type: t.inspectionTypeCode,
      date: t.plannedDate ?? '—',
      status: t.status,
    }));

  const lifeDistData = lifeDistRaw.length > 0 ? lifeDistRaw : [
    { name: '< 5 years', value: 0, color: '#ef4444' },
    { name: '5–10 years', value: 0, color: '#f97316' },
    { name: '10–20 years', value: 0, color: '#3b82f6' },
    { name: '> 20 years', value: 0, color: '#22c55e' },
  ];

  return (
    <div className="p-6 animate-page space-y-5">

      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col gap-2 mb-2">
        <button 
          className="flex w-fit items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/')}>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/assets')}>Tanks</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900 font-medium">{tankId}</span>
        </div>
      </div>

      {/* UX: High Visibility Alert Banner */}
      {kpi.complianceStatus === 'ACTION_REQUIRED' && (
        <div className="mt-2 bg-red-50 border-l-4 border-red-600 p-3 rounded-r-md flex items-start gap-3 shadow-sm">
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

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tank Details: {tankId}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Performance, integrity, and inspection overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export Report
          </button>
          <button className="btn-primary text-sm" onClick={() => navigate(`/inspections/new?tankId=${tankId}`)}>
            <Plus className="w-4 h-4" /> New Inspection
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {metricsQ.isLoading ? <Spinner /> : metricsQ.error ? <Err msg={(metricsQ.error as Error).message} /> : (
        <div className="grid grid-cols-6 gap-4">
          <KpiCard
            icon="📏"
            label="Current Thickness (mm)"
            value={kpi.currentThickness ? kpi.currentThickness.toFixed(2) : '—'}
            trend={<TrendBadge value={kpi.currentThicknessTrend} />}
          />
          <KpiCard
            icon="📉"
            label="Min. Thickness (mm)"
            value={kpi.minThickness ? kpi.minThickness.toFixed(2) : '—'}
            trend={<TrendBadge value={kpi.minThicknessTrend} />}
            highlight={(kpi.minThickness ?? 100) < 2.0}
          />
          <KpiCard
            icon="📈"
            label="Corrosion Rate (mm/yr)"
            value={kpi.corrosionRate ? kpi.corrosionRate.toFixed(2) : '—'}
            trend={<TrendBadge value={kpi.corrosionRateTrend} invert suffix=" " />}
          />
          <KpiCard
            icon="⏳"
            label="Remaining Life (years)"
            value={kpi.remainingLife !== undefined ? String(kpi.remainingLife) : '—'}
            trend={<TrendBadge value={kpi.remainingLifeTrend} suffix=" " />}
          />
          <KpiCard
            icon="⚠️"
            label="Critical Areas"
            value={String(kpi.criticalAreas ?? 0)}
            trend={<TrendBadge value={kpi.criticalAreasTrend} invert />}
            highlight={(kpi.criticalAreas ?? 0) > 0}
          />
          <KpiCard
            icon="🛡️"
            label="Compliance Status"
            value={kpi.complianceStatus?.replace(/_/g, ' ') ?? 'Unknown'}
            trend={<TrendBadge value={kpi.complianceScoreTrend} suffix="%" />}
            positive={kpi.complianceStatus === 'COMPLIANT' || (kpi.complianceScore ?? 0) >= 85}
            highlight={kpi.complianceStatus === 'ACTION_REQUIRED'}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Corrosion Heatmap */}
        <div className="tims-card p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Corrosion Heatmap – Top View</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex justify-center">
                {heatmapQ.isLoading ? <Spinner /> : <CorrosionHeatmapPlaceholder />}
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-[10px] text-slate-500 font-medium">mm</p>
                {[['5.0','#1e3a8a'],['4.0','#2563eb'],['3.0','#22d3ee'],['2.0','#86efac'],['1.0','#f97316'],['0','#dc2626']].map(([val, c]) => (
                  <div key={val} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                    <span className="text-[10px] text-slate-500">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs font-medium text-slate-600">Selected: {tankId}</span>
            <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold" onClick={() => navigate(`/heatmap/${tankId}`)}>
              Full Visualization <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Thickness Trend */}
        <div className="tims-card p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Thickness Trend</h3>
            <p className="text-[10px] text-slate-400 mb-3">(mm) Historical Average</p>
            {thicknessQ.isLoading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={thicknessData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="avgThickness" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} name="Avg Thickness" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1" onClick={() => navigate(`/tanks/${tankId}/trends`)}>
              View Trend Analysis <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Remaining Life Distribution */}
        <div className="tims-card p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Component Life Distribution</h3>
            {lifeDistQ.isLoading ? <Spinner /> : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={lifeDistData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                      {lifeDistData.map((entry, i) => (
                        <Cell key={i} fill={entry.color ?? PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {lifeDistData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-slate-600 flex-1">{entry.name}</span>
                      <span className="text-xs font-semibold text-slate-800">{entry.percent ?? 0}%</span>
                      <span className="text-xs text-slate-400">({entry.count ?? entry.value ?? 0})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-3 text-center">Breakdown by tank components</p>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent Inspections */}
        <div className="tims-card col-span-1 flex flex-col justify-between">
          <div>
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-slate-800">Recent Inspections</h3>
            </div>
            {inspectionsQ.isLoading ? <Spinner /> : (
              <table className="w-full tims-table">
                <thead>
                  <tr>
                    <th>Inspector</th>
                    <th>Type</th>
                    <th>Planned Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInspections.map((r) => (
                    <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/inspections/${r.id}`)}>
                      <td className="text-xs text-slate-600 font-medium">{r.inspector}</td>
                      <td className="text-xs">{r.type}</td>
                      <td className="text-xs text-slate-500">{r.date}</td>
                      <td>
                        <span className={`${statusBadge(r.status)} flex items-center leading-none whitespace-nowrap`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 mt-[1px] shrink-0" />
                          <span className="leading-none">{r.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentInspections.length === 0 && (
                     <tr><td colSpan={4} className="py-6 text-center text-xs text-slate-400 italic">No historical inspections found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <button className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1" onClick={() => navigate(`/tanks/${tankId}`)}>
              View All Inspections <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Top Critical Areas */}
        <div className="tims-card col-span-1 flex flex-col justify-between">
          <div>
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-slate-800">Critical Areas</h3>
            </div>
            {criticalAreasQ.isLoading ? <Spinner /> : (
              <table className="w-full tims-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Min. Thickness</th>
                    <th>Corrosion Rate</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalAreas.slice(0, 5).map((area: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="text-xs text-slate-600">{area.location ?? area.component ?? '—'}</td>
                      <td className="text-xs font-semibold text-slate-700">{area.minThickness ?? area.minThicknessMm ?? '—'}</td>
                      <td className="text-xs">{area.corrosionRate ?? area.corrRateMmYr ?? '—'}</td>
                      <td><span className={severityBadge(area.severity ?? '')}>{area.severity ?? '—'}</span></td>
                    </tr>
                  ))}
                  {criticalAreas.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-xs text-emerald-600 flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4"/> No critical areas identified</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 mt-auto">
            <button className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1" onClick={() => navigate(`/heatmap/${tankId}`)}>
              View All Critical Areas <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="tims-card col-span-1 flex flex-col justify-between">
          <div>
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Alerts & Activity</h3>
              <button className="text-xs font-semibold text-blue-600 hover:underline" onClick={() => navigate(`/tanks/${tankId}`)}>View Audit Log</button>
            </div>
            <div className="px-4 pb-4 space-y-3">
              {activity.length === 0 && !activityQ.isLoading ? (
                <div className="py-5 text-center text-xs text-slate-400 italic">No recent activity</div>
              ) : activity.slice(0, 4).map((item: any, idx: number) => {
                const severity = item.severity ?? item.riskCategory ?? 'info';
                const isHigh = severity === 'HIGH' || severity === 'high' || severity === 'error';
                const isMed = severity === 'MEDIUM' || severity === 'medium' || severity === 'warning';
                
                return (
                  <div key={item.id ?? idx} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isHigh ? 'bg-red-100' : isMed ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      {isHigh ? <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        : isMed ? <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                        : <Info className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.title ?? item.action ?? item.activity ?? '—'}</p>
                      <p className="text-[11px] text-slate-500 truncate">{item.detail ?? '—'}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{item.time ?? item.createdAt ?? '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="tims-card p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction
            icon={<Plus className="w-6 h-6 text-blue-600" />}
            label="New Inspection"
            desc="Create a new inspection record"
            primary
            onClick={() => navigate(`/upload`)}
          />
          <QuickAction
            icon={<span className="text-2xl">✏️</span>}
            label="Edit Tank"
            desc="Update technical details"
            onClick={() => navigate(`/assets/${tankId}/edit`)}
          />
          <QuickAction
            icon={<Upload className="w-6 h-6 text-slate-500" />}
            label="Import Data"
            desc="Upload UT readings"
            onClick={() => navigate(`/upload`)}
          />
          <QuickAction
            icon={<span className="text-2xl">📄</span>}
            label="Generate Report"
            desc="Download API 653 summary"
            onClick={() => navigate(`/reports/${tankId}`)}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, trend, highlight, positive }: {
  icon: string;
  label: string;
  value: string | number;
  trend?: React.ReactNode;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="tims-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <p className="text-xs font-semibold text-slate-500 leading-tight uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : positive ? 'text-green-600' : 'text-slate-900'}`}>
        {value}
      </p>
      <div className="mt-1">{trend}</div>
    </div>
  );
}

function QuickAction({ icon, label, desc, primary, onClick }: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all hover:shadow-md ${
        primary
          ? 'border-blue-400 border-dashed bg-blue-50 hover:bg-blue-100'
          : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${primary ? 'bg-blue-600' : 'bg-slate-100'}`}>
        {primary ? <Plus className="w-5 h-5 text-white" /> : icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
    </button>
  );
}

function CorrosionHeatmapPlaceholder() {
  const COLORS = ['#1e3a8a','#2563eb','#22d3ee','#86efac','#fde68a','#f97316','#dc2626'];
  const grid = Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: 7 }, (_, col) => {
      const dist = Math.sqrt((row - 3) ** 2 + (col - 3) ** 2);
      const idx = Math.min(Math.floor(dist * 1.2), COLORS.length - 1);
      return COLORS[COLORS.length - 1 - idx];
    })
  );

  return (
    <div className="relative flex flex-col items-center">
      <div className="text-[10px] text-slate-400 mb-1">0°</div>
      <div className="flex items-center gap-1">
        <div className="text-[10px] text-slate-400 mr-1">270°</div>
        <div
          className="overflow-hidden"
          style={{ width: 140, height: 140, borderRadius: '50%', border: '2px solid #e2e8f0' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', width: '100%', height: '100%' }}>
            {grid.flat().map((color, i) => (
              <div key={i} style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
        <div className="text-[10px] text-slate-400 ml-1">90°</div>
      </div>
      <div className="text-[10px] text-slate-400 mt-1">180°</div>
    </div>
  );
}
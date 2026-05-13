import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Plus, Download, ChevronRight,
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2,
  Info, Upload
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import { api } from '../api/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

interface KpiData {
  tanksMonitored?: number;
  tanksMonitoredTrend?: number;
  inspectionsCompleted?: number;
  inspectionsCompletedTrend?: number;
  avgCorrosionRate?: number;
  avgCorrosionRateTrend?: number;
  minRemainingLife?: number;
  minRemainingLifeTrend?: number;
  criticalAreasDetected?: number;
  criticalAreasTrend?: number;
  complianceScore?: number;
  complianceScoreTrend?: number;
  totalTanks?: number;
  openDefects?: number;
  overdueInspections?: number;
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
  if (s === 'completed' || s === 'complete') return 'inline-flex items-center gap-1 text-xs font-medium text-green-700';
  if (s === 'in_progress' || s === 'inprogress') return 'inline-flex items-center gap-1 text-xs font-medium text-blue-700';
  if (s === 'overdue') return 'inline-flex items-center gap-1 text-xs font-medium text-red-700';
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
  if (value === undefined) return <span className="text-xs text-slate-400">—</span>;
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

export default function Dashboard() {
  const navigate = useNavigate();

  const metricsQ = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: dashboardApi.getMetrics,
    staleTime: 30_000,
  });

  const tanksQ = useQuery({
    queryKey: ['dashboard', 'tanks'],
    queryFn: async () => {
      const res = await dashboardApi.getTanks({ size: 100 });
      return (res as any)?.content ?? res ?? [];
    },
    staleTime: 30_000,
  });

  const activityQ = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: dashboardApi.getActivityFeed,
    staleTime: 60_000,
  });

  const thicknessQ = useQuery({
    queryKey: ['dashboard', 'thickness-trend'],
    queryFn: () => api.get<any[]>('/dashboard/thickness-trend'),
    staleTime: 60_000,
  });

  const heatmapTanksQ = useQuery({
    queryKey: ['dashboard', 'heatmap-tanks'],
    queryFn: () => api.get<any[]>('/dashboard/heatmap-tanks'),
    staleTime: 60_000,
  });

  const criticalAreasQ = useQuery({
    queryKey: ['dashboard', 'critical-areas'],
    queryFn: () => api.get<any>('/dashboard/critical-areas'),
    staleTime: 60_000,
  });

  const lifeDistQ = useQuery({
    queryKey: ['dashboard', 'life-distribution'],
    queryFn: () => api.get<any>('/dashboard/life-distribution'),
    staleTime: 60_000,
  });

  const kpi: KpiData = metricsQ.data ?? {};
  const tanks: any[] = (tanksQ.data as any) ?? [];
  const activity: any[] = (activityQ.data as any)?.content ?? (activityQ.data as any) ?? [];
  const thicknessData: any[] = (thicknessQ.data as any) ?? [];
  const heatmapTanks: any[] = (heatmapTanksQ.data as any) ?? [];
  const criticalAreas: any[] = (criticalAreasQ.data as any)?.content ?? (criticalAreasQ.data as any) ?? [];
  const lifeDistRaw: any[] = (lifeDistQ.data as any)?.distribution ?? (lifeDistQ.data as any) ?? [];

  const recentInspections = tanks.slice(0, 5).map((t: any) => ({
    id: t.lastInspectionId ?? `INSP-${t.tankId}`,
    tankId: t.tankId ?? t.id,
    type: t.lastInspectionType ?? 'UT',
    date: t.lastInspectionDate ?? '—',
    status: t.complianceStatus === 'COMPLIANT' ? 'Completed' : 'In Progress',
  }));

  const tanksMonitored = kpi.tanksMonitored ?? kpi.totalTanks ?? tanks.length;
  const inspCompleted = kpi.inspectionsCompleted ?? 0;
  const avgCorrosion = kpi.avgCorrosionRate ?? 0;
  const minLife = kpi.minRemainingLife ?? 0;
  const criticalCount = kpi.criticalAreasDetected ?? kpi.openDefects ?? 0;
  const complianceScore = kpi.complianceScore ?? 0;

  const lifeDistData = lifeDistRaw.length > 0 ? lifeDistRaw : [
    { name: '< 5 years', value: 0, color: '#ef4444' },
    { name: '5–10 years', value: 0, color: '#f97316' },
    { name: '10–20 years', value: 0, color: '#3b82f6' },
    { name: '> 20 years', value: 0, color: '#22c55e' },
  ];

  return (
    <div className="p-6 animate-page space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of tank integrity and inspection performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export Dashboard
          </button>
          <button className="btn-primary text-sm" onClick={() => navigate('/inspections/new')}>
            <Plus className="w-4 h-4" /> New Inspection
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {metricsQ.isLoading ? <Spinner /> : metricsQ.error ? <Err msg={(metricsQ.error as Error).message} /> : (
        <div className="grid grid-cols-6 gap-4">
          <KpiCard
            icon="🗄️"
            label="Tanks Monitored"
            value={String(tanksMonitored)}
            trend={<TrendBadge value={kpi.tanksMonitoredTrend} />}
          />
          <KpiCard
            icon="✅"
            label="Inspections Completed"
            value={String(inspCompleted)}
            trend={<TrendBadge value={kpi.inspectionsCompletedTrend} />}
          />
          <KpiCard
            icon="📈"
            label="Avg. Corrosion Rate (mm/year)"
            value={avgCorrosion.toFixed(2)}
            trend={<TrendBadge value={kpi.avgCorrosionRateTrend} invert suffix=" " />}
          />
          <KpiCard
            icon="⏳"
            label="Min. Remaining Life (years)"
            value={String(minLife)}
            trend={<TrendBadge value={kpi.minRemainingLifeTrend} suffix=" " />}
          />
          <KpiCard
            icon="⚠️"
            label="Critical Areas Detected"
            value={String(criticalCount)}
            trend={<TrendBadge value={kpi.criticalAreasTrend} invert />}
            highlight={criticalCount > 0}
          />
          <KpiCard
            icon="🛡️"
            label="Compliance Score (API 653)"
            value={`${complianceScore}%`}
            trend={<TrendBadge value={kpi.complianceScoreTrend} suffix="%" />}
            positive={complianceScore >= 85}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Corrosion Heatmap */}
        <div className="tims-card p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Corrosion Heatmap (Thickness) – Top View</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <CorrosionHeatmapPlaceholder />
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
          <div className="mt-3 flex items-center justify-between">
            <select className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white">
              {heatmapTanks.length > 0
                ? heatmapTanks.map((t: any) => (
                    <option key={t.tankId ?? t.id} value={t.tankId ?? t.id}>
                      {t.tankId ?? t.id} ({t.service ?? t.name ?? 'Tank'})
                    </option>
                  ))
                : <option>T-101 (Crude Oil Tank)</option>
              }
            </select>
            <button
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              onClick={() => navigate('/heatmap')}
            >
              View Full Visualization <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Thickness Trend */}
        <div className="tims-card p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Thickness Trend (Average)</h3>
          <p className="text-[10px] text-slate-400 mb-3">(mm)</p>
          {thicknessQ.isLoading ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={thicknessData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="avgThickness" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} name="Average Thickness" />
              </LineChart>
            </ResponsiveContainer>
          )}
          <button
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2"
            onClick={() => navigate('/report')}
          >
            View Trend Analysis <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Remaining Life Distribution */}
        <div className="tims-card p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Remaining Life Distribution</h3>
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
          <p className="text-[10px] text-slate-400 mt-3">Based on current corrosion rate and trend</p>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Recent Inspections */}
        <div className="tims-card col-span-1">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-slate-800">Recent Inspections</h3>
          </div>
          {tanksQ.isLoading ? <Spinner /> : (
            <table className="w-full tims-table">
              <thead>
                <tr>
                  <th>Inspection ID</th>
                  <th>Tank ID</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInspections.map((r, i) => (
                  <tr key={i} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate('/inspections')}>
                    <td className="text-xs text-slate-600">{r.id}</td>
                    <td className="text-xs font-medium">{r.tankId}</td>
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
              </tbody>
            </table>
          )}
          <div className="px-4 py-3 border-t border-slate-100">
            <button className="text-xs text-blue-600 hover:underline flex items-center gap-1" onClick={() => navigate('/inspections')}>
              View All Inspections <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Top Critical Areas */}
        <div className="tims-card col-span-1">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-slate-800">Top Critical Areas</h3>
          </div>
          {criticalAreasQ.isLoading ? <Spinner /> : (
            <table className="w-full tims-table">
              <thead>
                <tr>
                  <th>Tank ID</th>
                  <th>Location</th>
                  <th>Min. Thickness</th>
                  <th>Corrosion Rate</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {criticalAreas.slice(0, 5).map((area: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="text-xs font-medium">{area.tankId ?? '—'}</td>
                    <td className="text-xs text-slate-600">{area.location ?? area.component ?? '—'}</td>
                    <td className="text-xs">{area.minThickness ?? area.minThicknessMm ?? '—'}</td>
                    <td className="text-xs">{area.corrosionRate ?? area.corrRateMmYr ?? '—'}</td>
                    <td><span className={severityBadge(area.severity ?? '')}>{area.severity ?? '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-4 py-3 border-t border-slate-100">
            <button className="text-xs text-blue-600 hover:underline flex items-center gap-1" onClick={() => navigate('/heatmap')}>
              View All Critical Areas <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="tims-card col-span-1">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Alerts & Notifications</h3>
            <button className="text-xs text-blue-600 hover:underline" onClick={() => navigate('/alerts')}>View All</button>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {activity.slice(0, 4).map((item: any, idx: number) => {
              const severity = item.severity ?? item.riskCategory ?? 'info';
              const isHigh = severity === 'HIGH' || severity === 'high' || severity === 'error';
              const isMed = severity === 'MEDIUM' || severity === 'medium' || severity === 'warning';
              const isInfo = !isHigh && !isMed;
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
                    <p className="text-[11px] text-slate-500 truncate">{item.detail ?? item.tank ?? '—'}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{item.time ?? item.createdAt ?? '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="tims-card p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-5 gap-3">
          <QuickAction
            icon={<Plus className="w-6 h-6 text-blue-600" />}
            label="New Asset"
            desc="Create a new tank asset in the system"
            primary
            onClick={() => navigate('/assets/new')}
          />
          <QuickAction
            icon={<span className="text-2xl">🗄️</span>}
            label="Asset List"
            desc="View and manage all tank assets"
            onClick={() => navigate('/assets')}
          />
          <QuickAction
            icon={<span className="text-2xl">✏️</span>}
            label="Update Asset"
            desc="Edit asset details and configuration"
            onClick={() => navigate('/assets')}
          />
          <QuickAction
            icon={<span className="text-2xl">📋</span>}
            label="New Inspection"
            desc="Create a new inspection for a tank"
            onClick={() => navigate('/inspections/new')}
          />
          <QuickAction
            icon={<Upload className="w-6 h-6 text-slate-500" />}
            label="Import Data"
            desc="Upload UT data or other datasets"
            onClick={() => navigate('/upload')}
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
  value: string;
  trend: React.ReactNode;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="tims-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <p className="text-xs text-slate-500 leading-tight">{label}</p>
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
        {primary
          ? <Plus className="w-5 h-5 text-white" />
          : icon
        }
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
  // Visual placeholder grid - actual data would come from the heatmap API
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

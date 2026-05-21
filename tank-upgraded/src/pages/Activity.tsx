import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Search, Download, Eye, ChevronLeft, ChevronRight,
  RefreshCw, X, Package, ClipboardList, Cloud,
  Settings2, BarChart2, FileText, User, Shield, Activity as ActivityIcon
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityRecord {
  id: number;
  datetime: string;
  activity: string;
  description: string;
  module: string;
  entityId?: string;
  entityName?: string;
  entityRef?: string;
  performedBy: string;
  role: string;
  severity: string;
  ipAddress?: string;
}

interface ActivitySummary {
  total: number;
  assetActivities: number;
  inspectionActivities: number;
  userManagement: number;
  systemActivities: number;
  assetPct?: number;
  inspectionPct?: number;
  userPct?: number;
  systemPct?: number;
}

interface ActivityPage {
  content: ActivityRecord[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityBadge(sev: string) {
  const s = (sev ?? '').toLowerCase();
  if (s === 'high' || s === 'critical') return 'px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700';
  if (s === 'medium') return 'px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700';
  if (s === 'low') return 'px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700';
  if (s === 'info') return 'px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700';
  return 'px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600';
}

function moduleIcon(mod: string) {
  const m = (mod ?? '').toLowerCase();
  if (m.includes('asset')) return <Package className="w-4 h-4 text-emerald-600" />;
  if (m.includes('inspection')) return <ClipboardList className="w-4 h-4 text-blue-600" />;
  if (m.includes('data') || m.includes('ingestion')) return <Cloud className="w-4 h-4 text-cyan-600" />;
  if (m.includes('calc') || m.includes('analysis')) return <Settings2 className="w-4 h-4 text-purple-600" />;
  if (m.includes('report')) return <FileText className="w-4 h-4 text-orange-500" />;
  if (m.includes('user')) return <User className="w-4 h-4 text-indigo-600" />;
  if (m.includes('visual')) return <BarChart2 className="w-4 h-4 text-pink-600" />;
  if (m.includes('system')) return <Shield className="w-4 h-4 text-slate-500" />;
  return <ActivityIcon className="w-4 h-4 text-slate-400" />;
}

function moduleIconBg(mod: string) {
  const m = (mod ?? '').toLowerCase();
  if (m.includes('asset')) return 'bg-emerald-50';
  if (m.includes('inspection')) return 'bg-blue-50';
  if (m.includes('data') || m.includes('ingestion')) return 'bg-cyan-50';
  if (m.includes('calc') || m.includes('analysis')) return 'bg-purple-50';
  if (m.includes('report')) return 'bg-orange-50';
  if (m.includes('user')) return 'bg-indigo-50';
  if (m.includes('visual')) return 'bg-pink-50';
  return 'bg-slate-50';
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <ActivityIcon className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm font-medium">No activities found</p>
      <p className="text-xs mt-1">Try adjusting your filters</p>
    </div>
  );
}

// ── Activity Detail Modal ─────────────────────────────────────────────────────

function DetailModal({ record, onClose }: { record: ActivityRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">Activity Details</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Activity" value={record.activity} />
            <Field label="Module" value={record.module} />
            <Field label="Date & Time" value={record.datetime} />
            <Field label="Severity" value={
              <span className={severityBadge(record.severity)}>{record.severity}</span>
            } />
            <Field label="Performed By" value={`${record.performedBy} (${record.role})`} />
            <Field label="IP Address" value={record.ipAddress ?? '—'} />
            {record.entityId && <Field label="Entity ID" value={record.entityId} />}
            {record.entityName && <Field label="Entity Name" value={record.entityName} />}
          </div>

          {record.description && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Description</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{record.description}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function ActivityPage() {
  const [search, setSearch] = useState('');
  const [activityType, setActivityType] = useState('');
  const [module, setModule] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [detailRecord, setDetailRecord] = useState<ActivityRecord | null>(null);

  // ── Data queries ──────────────────────────────────────────────────────────

  const summaryQ = useQuery({
    queryKey: ['activity', 'summary'],
    queryFn: () => api.get<ActivitySummary>('/activity/summary'),
    staleTime: 30_000,
  });

  const activityQ = useQuery({
    queryKey: ['activity', 'list', search, activityType, module, userFilter, severity, page, pageSize],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(page),
        size: String(pageSize),
      });
      if (search) qs.set('search', search);
      if (activityType) qs.set('type', activityType);
      if (module) qs.set('module', module);
      if (userFilter) qs.set('user', userFilter);
      if (severity) qs.set('severity', severity);
      return api.get<ActivityPage>(`/activity?${qs.toString()}`);
    },
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

  const usersQ = useQuery({
    queryKey: ['activity', 'users'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/activity/users'),
    staleTime: 60_000,
  });

  const modulesQ = useQuery({
    queryKey: ['activity', 'modules'],
    queryFn: () => api.get<string[]>('/activity/modules'),
    staleTime: 60_000,
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const summary: ActivitySummary = summaryQ.data ?? {
    total: 0, assetActivities: 0, inspectionActivities: 0,
    userManagement: 0, systemActivities: 0,
  };

  const records: ActivityRecord[] = activityQ.data?.content ?? [];
  const totalElements = activityQ.data?.totalElements ?? 0;
  const totalPages = activityQ.data?.totalPages ?? 0;
  const users: { id: string; name: string }[] = usersQ.data ?? [];
  const modules: string[] = modulesQ.data ?? [];

  const clearFilters = () => {
    setSearch('');
    setActivityType('');
    setModule('');
    setUserFilter('');
    setSeverity('');
    setPage(0);
  };

  const hasFilters = !!(search || activityType || module || userFilter || severity);

  const handleExport = async () => {
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (activityType) qs.set('type', activityType);
      if (module) qs.set('module', module);
      if (userFilter) qs.set('user', userFilter);
      if (severity) qs.set('severity', severity);
      const res = await fetch(`/api/activity/export?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('tims_token') ?? ''}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'activity-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  const startItem = totalElements === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalElements);

  const renderPageButtons = () => {
    const btns: React.ReactNode[] = [];
    const maxVisible = 3;
    const start = Math.max(0, Math.min(page - 1, totalPages - maxVisible));
    const end = Math.min(totalPages, start + maxVisible);

    if (start > 0) {
      btns.push(<PageBtn key={0} n={1} current={page} onClick={() => setPage(0)} />);
      if (start > 1) btns.push(<span key="el1" className="px-1 text-slate-400">...</span>);
    }
    for (let i = start; i < end; i++) {
      btns.push(<PageBtn key={i} n={i + 1} current={page} onClick={() => setPage(i)} />);
    }
    if (end < totalPages) {
      if (end < totalPages - 1) btns.push(<span key="el2" className="px-1 text-slate-400">...</span>);
      btns.push(<PageBtn key={totalPages - 1} n={totalPages} current={page} onClick={() => setPage(totalPages - 1)} />);
    }
    return btns;
  };

  return (
    <div className="p-6 animate-page space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Activity</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">All Activity</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">All Activity</h1>
          <p className="text-sm text-slate-500 mt-0.5">View all system activities and user actions</p>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Summary Cards */}
      {summaryQ.isLoading ? (
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="tims-card p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          <SummaryCard
            icon={<ActivityIcon className="w-5 h-5 text-white" />}
            bg="bg-blue-500"
            label="Total Activities"
            value={summary.total.toLocaleString()}
            sub="In selected period"
          />
          <SummaryCard
            icon={<Package className="w-5 h-5 text-white" />}
            bg="bg-emerald-500"
            label="Asset Activities"
            value={summary.assetActivities.toLocaleString()}
            sub={`${summary.assetPct ?? Math.round((summary.assetActivities / Math.max(summary.total, 1)) * 100)}% of total`}
          />
          <SummaryCard
            icon={<ClipboardList className="w-5 h-5 text-white" />}
            bg="bg-purple-500"
            label="Inspection Activities"
            value={summary.inspectionActivities.toLocaleString()}
            sub={`${summary.inspectionPct ?? Math.round((summary.inspectionActivities / Math.max(summary.total, 1)) * 100)}% of total`}
          />
          <SummaryCard
            icon={<User className="w-5 h-5 text-white" />}
            bg="bg-orange-500"
            label="User Management"
            value={summary.userManagement.toLocaleString()}
            sub={`${summary.userPct ?? Math.round((summary.userManagement / Math.max(summary.total, 1)) * 100)}% of total`}
          />
          <SummaryCard
            icon={<Shield className="w-5 h-5 text-white" />}
            bg="bg-teal-500"
            label="System Activities"
            value={summary.systemActivities.toLocaleString()}
            sub={`${summary.systemPct ?? Math.round((summary.systemActivities / Math.max(summary.total, 1)) * 100)}% of total`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activity, user, asset..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <FilterSelect
          value={activityType}
          onChange={v => { setActivityType(v); setPage(0); }}
          placeholder="All Activity Types"
          options={['Asset Created', 'Asset Updated', 'Inspection Created', 'Inspection Status Changed',
            'UT Data Uploaded', 'Corrosion Analysis Completed', 'Report Generated',
            'User Logged In', 'Visualization Viewed', 'System Backup Completed']}
        />

        <FilterSelect
          value={module}
          onChange={v => { setModule(v); setPage(0); }}
          placeholder="All Modules"
          options={modules.length > 0 ? modules : ['Assets', 'Inspections', 'Data Ingestion', 'Calculations', 'Reports', 'User Management', 'Visualizations', 'System']}
        />

        <FilterSelect
          value={userFilter}
          onChange={v => { setUserFilter(v); setPage(0); }}
          placeholder="All Users"
          options={users.map(u => u.name)}
        />

        <FilterSelect
          value={severity}
          onChange={v => { setSeverity(v); setPage(0); }}
          placeholder="All Severity Levels"
          options={['High', 'Medium', 'Low', 'Info']}
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="tims-card">
        {activityQ.isLoading ? (
          <Spinner />
        ) : records.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full tims-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Activity</th>
                <th>Module</th>
                <th>Entity / Reference</th>
                <th>Performed By</th>
                <th>Severity</th>
                <th>IP Address</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">

                  {/* Date & Time */}
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${moduleIconBg(rec.module)}`}>
                        {moduleIcon(rec.module)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-800">
                          {rec.datetime ? new Date(rec.datetime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {rec.datetime ? new Date(rec.datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Activity */}
                  <td>
                    <p className="text-sm font-semibold text-slate-800">{rec.activity}</p>
                    <p className="text-xs text-slate-500">{rec.description}</p>
                  </td>

                  {/* Module */}
                  <td>
                    <div className="flex items-center gap-1.5">
                      {moduleIcon(rec.module)}
                      <span className="text-sm text-slate-700">{rec.module}</span>
                    </div>
                  </td>

                  {/* Entity / Reference */}
                  <td>
                    {rec.entityId ? (
                      <div>
                        <p className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                          {rec.entityId}{rec.entityName ? ` (${rec.entityName})` : ''}
                        </p>
                        {rec.entityRef && (
                          <p className="text-[10px] text-slate-400">{rec.entityRef}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Performed By */}
                  <td>
                    <p className="text-sm text-slate-800">{rec.performedBy}</p>
                    <p className="text-xs text-slate-400">{rec.role}</p>
                  </td>

                  {/* Severity */}
                  <td>
                    <span className={severityBadge(rec.severity)}>
                      {rec.severity ?? '—'}
                    </span>
                  </td>

                  {/* IP */}
                  <td className="text-xs text-slate-500 font-mono">
                    {rec.ipAddress ?? '—'}
                  </td>

                  {/* Details */}
                  <td>
                    <button
                      onClick={() => setDetailRecord(rec)}
                      className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalElements > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing {startItem} to {endItem} of {totalElements.toLocaleString()} activities
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1">
                {renderPageButtons()}
              </div>

              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 bg-white ml-2"
              >
                {PAGE_SIZE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s} / page</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailRecord && (
        <DetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
      )}
    </div>
  );
}

// ── Minor Components ──────────────────────────────────────────────────────────

function SummaryCard({ icon, bg, label, value, sub }: {
  icon: React.ReactNode; bg: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="tims-card p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-8 bg-no-repeat"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundPosition: 'right 10px center' }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function PageBtn({ n, current, onClick }: { n: number; current: number; onClick: () => void }) {
  const isActive = n - 1 === current;
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
        isActive ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {n}
    </button>
  );
}

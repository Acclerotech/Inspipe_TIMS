/**
 * DashboardF.tsx
 * FIXES APPLIED:
 * - BUG FIX: Corrected semantic mismatch where `compBadge` was incorrectly applied to `riskCategory`.
 * - UX: Added Skeleton Loaders for the KPI strip to prevent layout jumping during data fetch.
 * - UX: Implemented premium empty states for the Table, Activity Feed, and Map.
 * - UX: Added interactive hover tooltips to the Site Plan tank nodes.
 * - UX: Fixed pagination math to ensure it never reads "Page 1 of 0".
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../api/useApi';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import {
  getDashboardMetrics,
  getRecentActivity,
} from '../api';
import { 
  Plus, Clock, AlertCircle, CheckCircle, Database, 
  ChevronRight, Upload, ClipboardCheck, Map,
  FileText, Camera, Activity, AlertOctagon
} from 'lucide-react';

// --- Types & Interfaces ---

interface DashboardMetricsDto {
  totalTanks: number;
  overdueInspections: number;
  highRiskTanks?: number;
  compliantTanks?: number;
  avgCorrosionRate?: number;
}

interface ActivityItem {
  id: number;
  tankId: string;
  userFullName: string;
  activityType: string;
  title: string;
  detail: string;
  occurredAt: string;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages?: number;
  size?: number;
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
  isLast?: boolean;
}

// --- Constants & Helper Functions ---

const TANK_POSITIONS: Record<string, { x: number; y: number }> = {
  'T-101': { x: 10, y: 25 }, 'T-102': { x: 26, y: 25 }, 'T-103': { x: 42, y: 25 },
  'T-104': { x: 58, y: 25 }, 'T-105': { x: 74, y: 25 }, 'T-106': { x: 90, y: 25 },
  'T-107': { x: 10, y: 52 }, 'T-108': { x: 28, y: 52 }, 'T-109': { x: 44, y: 52 },
  'T-110': { x: 62, y: 52 }, 'T-111': { x: 76, y: 52 }, 'T-112': { x: 90, y: 52 },
  'T-113': { x: 20, y: 78 }, 'T-114': { x: 36, y: 78 }, 'T-115': { x: 52, y: 78 },
  'T-116': { x: 70, y: 78 }, 'T-117': { x: 86, y: 78 },
};

function getStatusColor(risk?: string) {
  const r = risk?.toUpperCase();
  if (r === 'HIGH' || r === 'ACTION NEEDED' || r === 'CRITICAL') return 'bg-[#991b1b] shadow-red-500/40 ring-2 ring-red-200'; 
  if (r === 'MEDIUM' || r === 'MONITOR' || r === 'WARNING') return 'bg-[#d97706] shadow-orange-500/40 ring-2 ring-orange-200';    
  return 'bg-[#065f46] shadow-emerald-500/40 ring-2 ring-emerald-200'; 
}

function riskColor(r: string): string {
  const normalized = r?.toUpperCase();
  if (normalized === 'HIGH' || normalized === 'ACTION NEEDED' || normalized === 'CRITICAL') return '#b91c1c'; 
  if (normalized === 'MEDIUM' || normalized === 'MONITOR' || normalized === 'WARNING') return '#ea580c';    
  return '#15803d'; 
}

function getRiskBadgeClasses(risk?: string): string {
  const normalized = risk?.toUpperCase() || '';
  if (normalized === 'HIGH' || normalized === 'CRITICAL') return 'bg-red-50 text-red-700 border-red-200';
  if (normalized === 'MEDIUM' || normalized === 'WARNING') return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function getIconForActivity(type: string) {
  switch (type?.toUpperCase()) {
    case 'UPLOAD': return Upload;
    case 'IMPORT': return Database;
    case 'DEFECT': return AlertCircle;
    case 'ASSESSMENT': return ClipboardCheck;
    case 'REPORT': return FileText;
    case 'INSPECTION': return Camera;
    default: return Activity;
  }
}

function formatTimeAgo(dateString: string) {
  const diffInMs = new Date().getTime() - new Date(dateString).getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h`;
  return `${Math.floor(diffInHours / 24)}d`;
}

// --- Sub-components ---

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{msg}</div>;
}

function KpiCard({ label, value, sub, icon, iconBg, valueColor = 'text-slate-900', isLast = false }: KpiCardProps) {
  return (
    <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <div className={`text-2xl lg:text-3xl font-extrabold ${valueColor}`}>{value}</div>
          {isLast && typeof value !== 'object' && <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-500 inline ml-1 self-center" />}
        </div>
        <p className="text-[10px] lg:text-[11px] text-slate-400 mt-1 font-medium truncate">{sub}</p>
      </div>
      <div className={`p-2 lg:p-2.5 rounded-lg ${iconBg} shrink-0`}>
        {icon}
      </div>
    </div>
  );
}

// --- Main Component ---

export default function MainDashboard() {
  const navigate = useNavigate();
  
  // Data Fetching
  const { data: metrics, loading: ml, error: me } = useApi<DashboardMetricsDto>(getDashboardMetrics);
  
  const { data: activityData } = useApi<PaginatedResponse<ActivityItem>>(getRecentActivity as any);
  
  const tanksQ = useQuery({
    queryKey: ['dashboard', 'tanks', 'global'],
    queryFn: async () => {
      const res = await dashboardApi.getTanks({ size: 100 });
      return (res as any)?.content ?? res ?? [];
    },
    staleTime: 30_000,
  });

  // Safe Data Access
  const tanks = Array.isArray(tanksQ.data) ? tanksQ.data : [];
  const activityList = Array.isArray(activityData?.content) ? activityData.content : [];
  
  // Global Derivations
  const total = metrics?.totalTanks ?? tanks.length;
  const overdueCount = metrics?.overdueInspections ?? 0;
  const highRiskCount = metrics?.highRiskTanks ?? tanks.filter((t: any) => t.riskCategory?.toUpperCase() === 'HIGH' || t.riskCategory?.toUpperCase() === 'CRITICAL').length;
  const compliantCount = metrics?.compliantTanks ?? tanks.filter((t: any) => t.complianceStatus?.toUpperCase() === 'COMPLIANT').length;
  const compliancePct = total > 0 ? Math.round((compliantCount / total) * 100) : 0;

  // Pagination Logic (Fixed 0 page bug)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.max(1, Math.ceil(tanks.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentTanks = tanks.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const SkeletonValue = () => <div className="h-8 w-16 bg-slate-200 animate-pulse rounded-md mt-1 mb-1"></div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-page max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Fleet Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Global operations and asset integrity metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Site: All Terminals ({total} tanks)</option>
          </select>
          <button onClick={() => navigate('/assets/new')} className="btn-secondary text-sm px-4">
            Provision Asset
          </button>
          <button onClick={() => navigate('/inspections/new')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Log Inspection
          </button>
        </div>
      </div>

      {/* Global KPI Cards Strip */}
      {me ? <Err msg={me} /> : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <KpiCard label="TOTAL TANKS" value={ml ? <SkeletonValue /> : total} sub="Global fleet portfolio" icon={<Database className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" />
          <KpiCard label="CRITICAL / HIGH RISK" value={ml ? <SkeletonValue /> : highRiskCount} sub="Immediate action needed" icon={<AlertOctagon className="w-5 h-5 text-red-600" />} iconBg="bg-red-50" valueColor="text-red-600" />
          <KpiCard label="OVERDUE INSPECTIONS" value={ml ? <SkeletonValue /> : overdueCount} sub="Exceeds API 653 limits" icon={<Clock className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" valueColor="text-orange-600" />
          <KpiCard label="AVG CORROSION RATE" value={ml ? <SkeletonValue /> : `${metrics?.avgCorrosionRate?.toFixed(2) ?? '0.12'}`} sub="mm/year across fleet" icon={<Activity className="w-5 h-5 text-indigo-600" />} iconBg="bg-indigo-50" />
          <KpiCard label="COMPLIANCE SCORE" value={ml ? <SkeletonValue /> : `${compliancePct}%`} sub="Overall health status" icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-50" valueColor="text-emerald-600" isLast />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Site Plan Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-800">Site Plan Visualizer</p>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#15803d]" /> Healthy</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ea580c]" /> Warning</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#b91c1c]" /> Critical</span>
            </div>
          </div>
          
          <div className="relative bg-slate-50 border border-slate-100 rounded-lg flex-1 min-h-[400px] overflow-hidden">
            <svg className="absolute inset-0 w-full h-full opacity-10" pointerEvents="none">
              <path d="M0 40 H1000 M0 160 H1000 M0 280 H1000 M400 0 V400 M750 0 V400" stroke="#64748b" strokeWidth="8" fill="none" />
            </svg>
            
            {tanksQ.isLoading ? <Spinner /> : tanks.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                <Map className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">Map Unavailable</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">No assets have been provisioned to generate the geospatial site plan.</p>
              </div>
            ) : tanks.map((t: any) => {
              const pos = TANK_POSITIONS[t.tankId];
              if (!pos) return null;
              return (
                <button 
                  key={t.tankId} 
                  onClick={() => navigate(`/tanks/${t.tankId}`)}
                  className="absolute flex flex-col items-center group z-10 transition-transform hover:scale-110 hover:z-20"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-[10px] md:text-[11px] font-bold text-white shadow-md border-[3px] border-white/40 ${getStatusColor(t.riskCategory)}`}>
                    {t.tankId}
                  </div>
                  {/* UX: Hover Tooltip */}
                  <div className="absolute top-full mt-2 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-lg flex flex-col items-center z-30 transition-opacity">
                    <span className="font-bold">{t.tankId}</span>
                    <span className="text-slate-300">{t.service ?? 'Crude Oil'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Activity Feed */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col h-[480px]">
          <p className="text-sm font-bold text-slate-800 mb-5">Global Activity Feed</p>
          
          {activityList.length === 0 && !ml ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center pb-8">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Activity className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No recent activity</p>
              <p className="text-xs text-slate-500 mt-1 px-4">Audit events, dataset uploads, and reports will appear here.</p>
            </div>
          ) : (
            <div className="space-y-5 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {activityList.slice(0, 8).map((item) => {
                const Icon = getIconForActivity(item.activityType);
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {item.title} — 
                        <button onClick={() => navigate(`/tanks/${item.tankId}`)} className="text-blue-600 hover:text-blue-800 hover:underline ml-1 transition-colors">
                          {item.tankId}
                        </button>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {formatTimeAgo(item.occurredAt)} · By <span className="font-medium text-slate-700">{item.userFullName}</span> · {item.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Global Tanks Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Fleet Inventory & Status</h3>
        </div>
        
        {tanksQ.isLoading ? <Spinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 font-semibold">Tank ID</th>
                    <th className="px-5 py-3 font-semibold">Product/Service</th>
                    <th className="px-5 py-3 font-semibold">Risk Category</th>
                    <th className="px-5 py-3 font-semibold">Last Inspection</th>
                    <th className="px-5 py-3 font-semibold">Remaining Life</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentTanks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                         <Database className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                         <p className="text-sm font-semibold text-slate-700">No assets in inventory</p>
                         <p className="text-xs text-slate-500 mt-1 mb-4">Your fleet database is currently empty.</p>
                         <button onClick={() => navigate('/assets/new')} className="btn-primary text-xs mx-auto">
                           + Provision First Asset
                         </button>
                      </td>
                    </tr>
                  ) : currentTanks.map((t: any) => (
                    <tr key={t.tankId} onClick={() => navigate(`/tanks/${t.tankId}`)} className="cursor-pointer hover:bg-blue-50/50 transition-all group">
                      <td className="px-5 py-4 text-sm font-bold text-blue-600 group-hover:underline">{t.tankId}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{t.service ?? 'Crude Oil'}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border shadow-sm ${getRiskBadgeClasses(t.riskCategory)}`}>
                          {t.riskCategory?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{t.lastInspectionDate ?? 'N/A'}</span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{t.lastInspectionType || 'UT Survey'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700">{t.remainingLifeYr ?? '—'} <span className="text-xs font-normal text-slate-500">yr</span></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: riskColor(t.riskCategory) }} />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            {t.riskCategory?.toUpperCase() === 'HIGH' ? 'Critical' : t.riskCategory?.toUpperCase() === 'MEDIUM' ? 'Warning' : 'Healthy'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full group-hover:bg-blue-100 transition-colors">
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {tanks.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Page <span className="text-slate-800">{currentPage}</span> of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)); }} disabled={currentPage === 1} className="px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white rounded-md hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 transition-colors shadow-sm">
                    Previous
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white rounded-md hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 transition-colors shadow-sm">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
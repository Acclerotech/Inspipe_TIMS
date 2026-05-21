import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import { Plus, Search, ChevronRight, RefreshCw } from 'lucide-react';

function Spinner() {
  return <div className="flex items-center justify-center py-16"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>;
}

function riskBadge(r: string) {
  return r==='HIGH'?'badge-high':r==='MEDIUM'?'badge-medium':'badge-low';
}
function compBadge(c: string) {
  return c==='ACTION_REQUIRED'||c==='NON_COMPLIANT'?'badge-high':c==='COMPLIANT'?'badge-low':'badge-medium';
}
function compLabel(c: string) {
  if (c==='ACTION_REQUIRED') return 'Action Required';
  if (c==='NON_COMPLIANT') return 'Non Compliant';
  return c.charAt(0)+c.slice(1).toLowerCase().replace(/_/g,' ');
}

export default function Inspections() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const size = 10;

  const tanksQ = useQuery({
    queryKey: ['dashboard', 'tanks', '', ''],
    queryFn: async () => {
      const res = await dashboardApi.getTanks();
      return (res as any)?.content ?? res ?? [];
    },
    staleTime: 30_000,
  });

  const allTanks: any[] = tanksQ.data ?? [];

  const filtered = allTanks.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const tid = (t.tankId ?? t.id ?? '').toLowerCase();
    return tid.includes(q) || t.service?.toLowerCase().includes(q) ||
           (t.siteName ?? t.site ?? '').toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / size);
  const paginated = filtered.slice(page*size, (page+1)*size);

  return (
    <div className="p-5 animate-page">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Rotterdam Terminal A</p>
          <h1 className="text-xl font-bold text-slate-900">Inspections</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => tanksQ.refetch()} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5"/> Refresh
          </button>
          <button className="btn-primary text-xs" onClick={() => navigate('/planner')}>
            <Plus className="w-3.5 h-3.5"/> Log Inspection
          </button>
        </div>
      </div>

      {allTanks.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label:'Total Tanks', value: allTanks.length, color:'text-slate-800' },
            { label:'High Risk', value: allTanks.filter(t=>t.riskCategory==='HIGH').length, color:'text-red-600' },
            { label:'Action Required', value: allTanks.filter(t=>t.complianceStatus==='ACTION_REQUIRED').length, color:'text-orange-500' },
            { label:'Open Defects', value: allTanks.reduce((s,t)=>s+(t.openDefects??0),0), color:'text-red-500' },
          ].map(item => (
            <div key={item.label} className="tims-card p-4">
              <p className="field-label mb-1">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="tims-card">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0"/>
          <input
            value={search}
            onChange={e=>{setSearch(e.target.value);setPage(0);}}
            placeholder="Search by tank ID, service or site…"
            className="flex-1 text-sm text-slate-700 focus:outline-none bg-transparent placeholder-slate-400"
          />
          {search && <button onClick={()=>setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>}
          <span className="text-xs text-slate-400 ml-2">{filtered.length} results</span>
        </div>

        {tanksQ.isLoading ? <Spinner/> : tanksQ.error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-red-600 mb-2">{(tanksQ.error as Error).message}</p>
            <button onClick={() => tanksQ.refetch()} className="btn-secondary text-xs">Retry</button>
          </div>
        ) : (
          <>
            <table className="w-full tims-table">
              <thead>
                <tr>
                  <th>Tank ID</th><th>Site</th><th>Service</th><th>Last Inspection</th>
                  <th>Type</th><th>Next Due</th><th>Remaining Life</th>
                  <th>Risk</th><th>Open Defects</th><th>Compliance</th><th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-8 text-slate-400 text-sm">No tanks match your search</td></tr>
                ) : paginated.map((t:any) => {
                  const tid = t.tankId ?? t.id;
                  const life = t.remainingLifeYr ?? t.remainingLife ?? 0;
                  const nextDue = t.nextInspectionDue ?? '';
                  const lastDate = t.lastInspectionDate ?? '';
                  const lastType = t.lastInspectionType ?? '';
                  const openDef = t.openDefects ?? 0;
                  const site = t.siteName ?? t.site ?? '';
                  return (
                    <tr key={tid} className="cursor-pointer hover:bg-slate-50" onClick={()=>navigate(`/tanks/${tid}`)}>
                      <td className="font-semibold text-blue-600">{tid}</td>
                      <td className="text-xs text-slate-500">{site}</td>
                      <td className="text-xs">{t.service}</td>
                      <td className="text-xs text-slate-500">{lastDate}</td>
                      <td className="text-xs text-slate-500">{lastType}</td>
                      <td className={`text-xs font-semibold ${life<2?'text-red-600':'text-slate-700'}`}>{nextDue}</td>
                      <td><span className={`text-xs font-bold ${life<2?'text-red-600':life<4?'text-orange-500':'text-green-600'}`}>{life} yr</span></td>
                      <td><span className={riskBadge(t.riskCategory)}>{t.riskCategory}</span></td>
                      <td>{openDef>0?<span className="badge-open">{openDef} open</span>:<span className="text-slate-400 text-xs">—</span>}</td>
                      <td><span className={compBadge(t.complianceStatus)}>{compLabel(t.complianceStatus)}</span></td>
                      <td><ChevronRight className="w-4 h-4 text-slate-300"/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">Page {page+1} of {totalPages||1}</p>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</button>
                <button className="btn-secondary text-xs" disabled={page+1>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarApi, inspectionApi } from '../services/api';
import { CalendarDays, Download, AlertTriangle, CheckSquare } from 'lucide-react';

function Spinner() {
  return <div className="flex items-center justify-center py-12"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>;
}

const STATUS_BADGE: Record<string, string> = {
  PLANNED: 'badge-planned', IN_PROGRESS: 'badge-inprogress',
  COMPLETED: 'badge-complete', COMPLETE: 'badge-complete',
  CANCELLED: 'badge-overdue', OVERDUE: 'badge-high',
};

function typeShort(t: string) {
  const up = (t ?? '').toUpperCase();
  if (up.includes('VISUAL')) return 'V';
  if (up.includes('UT')) return 'UT';
  if (up.includes('MFL')) return 'MFL';
  if (up.includes('INTERNAL') || up === 'INT') return 'INT';
  if (up.includes('EXTERNAL')) return 'E';
  return (t ?? '').slice(0,3).toUpperCase();
}

function typeColor(t: string, hex?: string) {
  if (hex) return hex;
  const up = (t ?? '').toUpperCase();
  if (up.includes('VISUAL')) return '#3b82f6';
  if (up.includes('UT')) return '#16a34a';
  if (up.includes('MFL')) return '#7c3aed';
  if (up.includes('INTERNAL')) return '#dc2626';
  if (up.includes('EXTERNAL')) return '#0d9488';
  return '#64748b';
}

export default function Planner() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [workpackMsg, setWorkpackMsg] = useState('');

  const eventsQ = useQuery({
    queryKey: ['calendar', 'events'],
    queryFn: () => calendarApi.getEvents(),
    staleTime: 60_000,
  });

  const conflictsQ = useQuery({
    queryKey: ['calendar', 'conflicts'],
    queryFn: calendarApi.getConflicts,
    staleTime: 5 * 60_000,
  });

  const genWorkpackMut = useMutation({
    mutationFn: (inspectionId: string) => calendarApi.generateWorkpack(inspectionId),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      inspectionApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });

  const events: any[] = eventsQ.data ?? [];
  const conflicts: any[] = conflictsQ.data ?? [];

  // Normalize event fields (handle both API shapes)
  const normalized = events.map(e => ({
    id: String(e.id ?? e.inspectionId ?? ''),
    tankId: e.tankId ?? '',
    site: e.site ?? e.siteName ?? '',
    risk: e.risk ?? e.riskCategory ?? 'LOW',
    weekNumber: e.weekNumber ?? e.week ?? 0,
    type: e.type ?? e.inspectionType ?? 'VISUAL',
    color: e.color ?? '',
    colorHex: e.colorHex ?? '',
    status: e.status ?? 'PLANNED',
    plannedDate: e.plannedDate ?? '',
  }));

  const tankIds = [...new Set(normalized.map(e => e.tankId))].sort();
  const weeks = [...new Set(normalized.map(e => e.weekNumber).filter(Boolean))].sort((a,b)=>a-b);

  const overdueEvents = normalized.filter(e =>
    e.status === 'OVERDUE' || (e.status === 'PLANNED' && e.plannedDate && new Date(e.plannedDate) < new Date())
  );

  const handleGenerateWorkpack = async (event: any) => {
    setWorkpackMsg('Generating workpack…');
    const t0 = Date.now();
    try {
      const wp = await genWorkpackMut.mutateAsync(event.id);
      const elapsed = Date.now() - t0;
      setWorkpackMsg(`✓ Workpack ready in ${(elapsed/1000).toFixed(1)}s — ${wp.id}`);
    } catch {
      setWorkpackMsg('⚠ Failed to generate workpack');
    }
  };

  return (
    <div className="p-5 animate-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Inspection Calendar & WSE Planner</h1>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs"><CalendarDays className="w-3.5 h-3.5"/> Q2–Q3 2026 ▾</button>
          <select className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none">
            <option>All Sites</option>
          </select>
          <select className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none">
            <option>All Types</option>
          </select>
          <button className="btn-success text-xs">Auto-schedule</button>
          <button className="btn-secondary text-xs"><Download className="w-3.5 h-3.5"/> Export Plan</button>
        </div>
      </div>

      {workpackMsg && (
        <div className={`mb-3 text-xs px-3.5 py-2 rounded border ${workpackMsg.startsWith('✓')?'bg-green-50 border-green-200 text-green-700':workpackMsg.startsWith('⚠')?'bg-red-50 border-red-200 text-red-700':'bg-blue-50 border-blue-200 text-blue-700'}`}>
          {workpackMsg}
        </div>
      )}

      {eventsQ.isLoading ? <Spinner/> : eventsQ.error ? (
        <div className="tims-card p-6 text-sm text-red-600 text-center">{(eventsQ.error as Error).message}</div>
      ) : (
        <div className="flex gap-4">
          {/* Gantt grid */}
          <div className="flex-1 min-w-0">
            <div className="tims-card overflow-auto">
              {normalized.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No inspection events found</div>
              ) : (
                <table className="border-collapse" style={{minWidth: Math.max(700, weeks.length*60+200)}}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-xs font-semibold text-slate-600 px-3 py-2 text-left w-28 sticky left-0 bg-slate-50 z-10">Tank</th>
                      <th className="text-xs font-semibold text-slate-600 px-2 py-2 text-center w-16">Risk</th>
                      {weeks.map(w => (
                        <th key={w} className="text-center py-1.5 px-0.5" style={{minWidth:52}}>
                          <p className="text-[10px] font-bold text-slate-500">W{w}</p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tankIds.map(tankId => {
                      const tankEvents = normalized.filter(e => e.tankId === tankId);
                      const riskCategory = tankEvents[0]?.risk ?? 'LOW';
                      return (
                        <tr key={tankId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 sticky left-0 bg-white z-10">
                            <p className="text-xs font-semibold text-slate-800 cursor-pointer text-blue-600 hover:underline" onClick={() => navigate(`/tanks/${tankId}`)}>{tankId}</p>
                            <p className="text-[10px] text-slate-400">{tankEvents[0]?.site}</p>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={riskCategory==='HIGH'?'badge-high':riskCategory==='MEDIUM'?'badge-medium':'badge-low'}>{riskCategory}</span>
                          </td>
                          {weeks.map(w => {
                            const ev = tankEvents.find(e => e.weekNumber === w);
                            const color = ev ? typeColor(ev.type, ev.colorHex) : undefined;
                            return (
                              <td key={w} className="px-0.5 py-1.5 text-center">
                                {ev && (
                                  <button onClick={() => { setSelected(ev); handleGenerateWorkpack(ev); }}
                                    className="w-full rounded text-white text-[10px] font-bold py-1.5 px-0.5 leading-tight hover:opacity-80"
                                    style={{backgroundColor: color}}>
                                    <div>{typeShort(ev.type)}</div>
                                    <div className="font-normal opacity-90 truncate" style={{fontSize:8}}>{ev.type}</div>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* FIX CAL-002: conflict rendering + earlier-date recommendation */}
            {conflicts.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5"/> {conflicts.length} Scheduling Conflict{conflicts.length > 1 ? 's' : ''} Detected
                </p>
                {conflicts.map((c: any, i: number) => (
                  <div key={c.tankId ?? i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-800">
                        {c.message ?? `Conflict on tank ${c.tankId ?? '—'}`}
                      </p>
                      {/* CAL-002: earlier-date recommendation */}
                      {(c.proposedDate ?? c.earlierDate ?? c.recommendedDate) && (
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          📅 Recommended earlier date: <strong>{c.proposedDate ?? c.earlierDate ?? c.recommendedDate}</strong>
                        </p>
                      )}
                      {c.reason && (
                        <p className="text-[11px] text-amber-600 mt-0.5">Reason: {c.reason}</p>
                      )}
                      <button className="text-[11px] text-amber-600 hover:underline mt-0.5" onClick={() => navigate(`/tanks/${c.tankId}`)}>
                        View tank →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {overdueEvents.length > 0 && conflicts.length === 0 && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
                <div>
                  <p className="text-xs font-semibold text-amber-800">{overdueEvents.length} inspection(s) overdue or past planned date</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">{overdueEvents.map(e => e.tankId).join(', ')} — review and reschedule</p>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-3 flex items-center gap-4 px-1 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Legend:</span>
              {[['Visual','#3b82f6'],['External','#0d9488'],['UT Survey','#16a34a'],['MFL Scan','#7c3aed'],['Internal','#dc2626']].map(([t,c]) => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className="w-6 h-4 rounded text-white text-[9px] font-bold flex items-center justify-center" style={{backgroundColor:c}}>{typeShort(t)}</div>
                  <span className="text-[11px] text-slate-500">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="w-64 shrink-0 space-y-3">
            <div className="tims-card p-4">
              <p className="text-sm font-bold text-slate-800 mb-3">Inspection Details</p>
              {selected ? (
                <>
                  <div className="flex items-start gap-2 mb-3">
                    <CalendarDays className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"/>
                    <p className="text-sm font-semibold text-slate-800">{selected.tankId} — {selected.type}</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      ['Week', `W${selected.weekNumber}`],
                      ['Planned Date', selected.plannedDate || '—'],
                      ['Site', selected.site],
                      ['Risk', selected.risk],
                    ].map(([k,v]) => (
                      <div key={k}><p className="field-label">{k}</p><p className="field-value text-xs">{v}</p></div>
                    ))}
                    <div>
                      <p className="field-label mb-1">Status</p>
                      <span className={STATUS_BADGE[selected.status] ?? 'badge-planned'}>{selected.status.replace(/_/g,' ')}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="field-label mb-2">Scope (WSE)</p>
                    {['Shell internal visual','UT thickness survey','Floor scanning (MFL)','Nozzle inspections','Settlement survey'].map(item => (
                      <div key={item} className="flex items-center gap-1.5 mb-1">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0"/>
                        <span className="text-[11px] text-slate-600">{item}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn-primary w-full justify-center text-xs mt-3"
                    onClick={() => handleGenerateWorkpack(selected)}
                    disabled={genWorkpackMut.isPending}>
                    {genWorkpackMut.isPending ? 'Generating…' : '↓ Generate Workpack'}
                  </button>
                  <button className="btn-secondary w-full justify-center text-xs mt-1" onClick={() => navigate(`/tanks/${selected.tankId}`)}>
                    View / Edit WSE
                  </button>
                </>
              ) : (
                <p className="text-xs text-slate-400">Click an event block to see details</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

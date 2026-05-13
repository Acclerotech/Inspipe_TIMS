/**
 * ReportBuilder.tsx
 * FIXES APPLIED (audit ref):
 *   - REP-001: handleCreate payload aligned to backend CreateReportRequest:
 *              templateId (Byte), standardId (Short), reportRef, sectionNames, signatories [{userId, role}]
 *   - REP-001: PDF open now uses /api/reports/{id}/pdf (was /download)
 *   - REP-002: exportCompliancePack now uses reportId (not tankId)
 *              Per-report export button added in reports list.
 *   - Fixed broken JSX: const reportId expression was inside JSX render — removed.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportApi, tankApi, TEMPLATE_IDS, STANDARD_IDS, type BackendCreateReportRequest } from '../services/api';
import {
  ChevronLeft, ChevronRight, Download, Printer,
  ZoomIn, ZoomOut, MoreHorizontal, Plus
} from 'lucide-react';

const ALL_SECTIONS = [
  'Executive summary',
  'Asset record & drawings',
  'Inspection history (2015, 2021, 2026)',
  'UT thickness survey (Apr 2026)',
  'MFL floor scan (Apr 2026)',
  'Corrosion rate & remaining life calculation',
  'Defect register (D1–D3)',
  'Heatmap & comparison images',
  'Recommendations & next inspection date',
  'Provenance & audit trail appendix',
  'Redactions / confidentiality marks',
];

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-medium',
  UNDER_REVIEW: 'badge-planned',
  GENERATED: 'badge-planned',
  SIGNED: 'badge-complete',
  APPROVED: 'badge-complete',
  PUBLISHED: 'badge-complete',
};

const STANDARD_OPTIONS = ['EEMUA 159 Ed.6', 'EEMUA 159 Ed.5'];

// Signatories with placeholder userId (in a real app these would come from user directory)
const DEFAULT_SIGNATORIES = [
  { userId: 1, name: 'R. Khan',  role: 'Author' },
  { userId: 2, name: 'J. Lilley', role: 'Reviewer' },
  { userId: 3, name: 'A. Patel', role: 'Approver' },
];

function Spinner() {
  return <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
}

export default function ReportBuilder() {
  const { tankId = 'T-105' } = useParams<{ tankId: string }>();
  const qc = useQueryClient();
  const [inspectionDate, setInspectionDate] = useState<string>(
  new Date().toISOString().split('T')[0]
  );
  const [sections, setSections] = useState(new Set(ALL_SECTIONS));
  const [templateKey, setTemplateKey] = useState<'WSE' | 'FFS' | 'ISE'>('WSE');
  const [standardKey, setStandardKey] = useState(STANDARD_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [signatories, setSignatories] = useState(DEFAULT_SIGNATORIES);
  const [generating, setGenerating] = useState(false);
  const [reportId, setReportId] = useState<string | number | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const reportsQ = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportApi.getAll(),
    staleTime: 30_000,
  });

  const tankQ = useQuery({
    queryKey: ['tanks', tankId],
    queryFn: () => tankApi.getDetail(tankId),
    enabled: !!tankId,
    staleTime: 60_000,
  });

  // FIX REP-001: aligned to BackendCreateReportRequest
  const createReportMut = useMutation({
    mutationFn: (body: BackendCreateReportRequest) => reportApi.create(body),
    onSuccess: (report) => {
      setReportId(report.id);
      setGeneratedAt(new Date().toLocaleString());
      setGenerating(false);
      qc.invalidateQueries({ queryKey: ['reports'] });
      // FIX REP-001: open /pdf not /download
      window.open(`/api/reports/${report.id}/pdf`, '_blank');
    },
    onError: () => setGenerating(false),
  });

  // FIX REP-002: exportCompliancePack uses reportId not tankId
  const exportPackMut = useMutation({
    mutationFn: (rId: string | number) => reportApi.exportCompliancePack(rId),
    onSuccess: (blob: any) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-pack-${tankId}-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const reports: any[] = (reportsQ.data as any[]) ?? [];
  const tank = tankQ.data as any;
  const totalPages = sections.size + 2;

  const toggleSection = (s: string) => {
    setSections(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  // FIX REP-001: build correct payload for backend CreateReportRequest
  const handleCreate = () => {
    setGenerating(true);
    const payload: BackendCreateReportRequest = {
      tankId,
      templateId: TEMPLATE_IDS[templateKey] ?? 1,
      standardId: STANDARD_IDS[standardKey] ?? 1,
      inspectionDate: tank?.lastInspectionDate ?? new Date().toISOString().split('T')[0],
      reportRef: `${templateKey}-${new Date().getFullYear()}-${tankId}`,
      sectionNames: [...sections],
      signatories: signatories.map(s => ({ userId: s.userId, role: s.role })),
    };
    createReportMut.mutate(payload);
  };

  const handleSign = (id: string | number) => {
    reportApi.sign(String(id), 'MFA_TOKEN_PLACEHOLDER');
  };

  const handleDownloadPdf = (id: string | number) => {
    reportApi.downloadPdf(id).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(err => alert((err as Error).message));
  };

  return (
    <div className="p-5 animate-page">
      <h1 className="text-xl font-bold text-slate-900 mb-4">
        Generate EEMUA 159 Compliance Report — {tankId}
      </h1>

      {tankQ.isLoading && <Spinner />}

      <div className="flex gap-4">
        {/* LEFT PANEL */}
        <div className="w-72 shrink-0 space-y-5">

          {/* Template */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">1. Choose report template</p>
            <div className="flex gap-2">
              {([
                ['WSE', 'Written Scheme of Examination'],
                ['FFS', 'EEMUA 159 §7'],
                ['ISE', 'EEMUA 159 §5'],
              ] as const).map(([id, sub]) => (
                <button key={id} onClick={() => setTemplateKey(id)}
                  className={`flex-1 p-2 rounded border-2 text-left transition-colors ${
                    templateKey === id ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{id}</span>
                    {templateKey === id && <span className="text-green-500">✓</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Standard */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">2. Standard</p>
            <select
              value={standardKey}
              onChange={e => setStandardKey(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white focus:outline-none"
            >
              {STANDARD_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Standard ID: {STANDARD_IDS[standardKey] ?? '—'}</p>
          </div>

          {/* Sections */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">3. Report sections</p>
            <div className="space-y-1">
              {ALL_SECTIONS.map(s => (
                <label key={s} className="flex items-start gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={sections.has(s)} onChange={() => toggleSection(s)}
                    className="mt-0.5 accent-blue-600" />
                  <span className="text-xs text-slate-600 leading-4">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Signatories */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">4. Approvers & signatures</p>
            <div className="space-y-2">
              {signatories.map((a, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded px-3 py-2 flex justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-800">{a.name}</p>
                    <p className="text-[10px] text-slate-500">User ID: {a.userId}</p>
                  </div>
                  <select className="text-[10px] text-slate-500 bg-transparent focus:outline-none"
                    value={a.role}
                    onChange={e => setSignatories(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}>
                    {['Author', 'Reviewer', 'Approver'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              ))}
              <button onClick={() => setSignatories(p => [...p, { userId: p.length + 1, name: 'New Approver', role: 'Reviewer' }])}
                className="w-full border border-dashed border-slate-300 rounded px-3 py-2 text-xs text-slate-400 hover:border-slate-400 text-left">
                + Add approver…
              </button>
            </div>
          </div>

          {/* Report options */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">5. Report options</p>
            <div className="text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Report Ref</span>
                <span className="font-mono text-slate-700">{templateKey}-{new Date().getFullYear()}-{tankId}</span>
              </div>
              <div className="flex justify-between">
                <span>Template ID</span>
                <span className="font-mono text-slate-700">{TEMPLATE_IDS[templateKey]}</span>
              </div>
              <div className="flex justify-between">
                <span>Standard ID</span>
                <span className="font-mono text-slate-700">{STANDARD_IDS[standardKey]}</span>
              </div>
              <div className="flex justify-between">
                <span>Sections</span>
                <span className="font-mono text-slate-700">{sections.size}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary flex-1 text-xs">Save template</button>
            <button onClick={handleCreate} disabled={generating || createReportMut.isPending}
              className="btn-primary text-xs disabled:opacity-50">
              {generating || createReportMut.isPending ? 'Generating…' : <><Plus className="w-3.5 h-3.5" /> Generate PDF</>}
            </button>
          </div>

          {reportId && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              ✓ Report generated at {generatedAt}. ID: {String(reportId).substring(0, 12)}
            </div>
          )}
          {createReportMut.error && (
            <p className="text-xs text-red-600">{(createReportMut.error as Error).message}</p>
          )}
          {exportPackMut.error && (
            <p className="text-xs text-red-600">{(exportPackMut.error as Error).message}</p>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 min-w-0">
          {/* LIVE PREVIEW */}
          <div className="tims-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b">
              <p className="text-sm font-semibold">Live preview (PDF)</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-mono">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="w-4 h-4" /></button>
                <button onClick={handleCreate} disabled={generating} className="text-xs text-blue-600 ml-2">
                  {generating ? 'Generating…' : 'Generate PDF'}
                </button>
              </div>
            </div>
            <div className="flex">
              <div className="flex-1 p-4 bg-gray-100 min-h-96">
                <div className="bg-white max-w-2xl mx-auto shadow text-sm">
                  <div className="bg-[#1e3a6e] px-5 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">Written Scheme of Examination</p>
                      <p className="text-blue-300 text-[10px]">{standardKey}</p>
                    </div>
                    <span className="text-blue-300 text-[10px]">{standardKey}</span>
                  </div>
                  <div className="px-5 py-3 text-slate-700 border-b border-slate-200">
                    <p className="font-semibold text-sm">Tank: {tankId} — {tank?.site ?? 'Rotterdam Terminal A'}</p>
                    <p className="text-[10px] text-slate-500">
                      Report Ref: {templateKey}-{new Date().getFullYear()}-{tankId} · Generated: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="px-5 py-3">
                    {sections.has('Executive summary') && (
                      <div className="mb-4">
                        <p className="font-bold text-slate-800 mb-1 text-xs">1. Executive summary</p>
                        <p className="text-[10px] text-slate-600 leading-4">
                          {tankId} has {tank?.remainingLife ?? '1.4'} years remaining life at current mean corrosion rate of {tank?.corrosionRate ?? '0.22'} mm/yr.
                          Three Class-3 floor defects identified; plate replacement recommended.
                        </p>
                      </div>
                    )}
                    {sections.has('Corrosion rate & remaining life calculation') && (
                      <div className="mb-4">
                        <p className="font-bold text-slate-800 mb-1 text-xs">2. Corrosion & remaining life</p>
                        <div className="text-[10px] text-slate-600 space-y-0.5">
                          <p>Mean corrosion rate: <strong>{tank?.corrosionRate ?? '0.22'} mm/yr</strong></p>
                          <p>Min thickness: <strong>{tank?.minThickness ?? '6.2'} mm (retirement: {tank?.retirementThickness ?? '6.0'} mm)</strong></p>
                          <p>Remaining life: <strong>{tank?.remainingLife ?? '1.4'} yr</strong></p>
                          <p>Next inspection: <strong>{tank?.nextInspectionDue ?? '—'}</strong></p>
                        </div>
                      </div>
                    )}
                    {sections.has('Provenance & audit trail appendix') && (
                      <p className="text-[9px] text-slate-400 italic">Provenance: All calculations traceable; data hashes recorded in §A. Signed by {signatories.map(a => a.name).join(', ')}.</p>
                    )}
                    <div className="border-t border-slate-100 pt-2 mt-3 flex justify-between text-[9px] text-slate-400">
                      <span>© {new Date().getFullYear()} TIMS Integrity Ltd.</span>
                      <span>Page {page} of {totalPages}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-12 border-l flex flex-col items-center gap-3 py-4 bg-slate-50">
                {[ZoomIn, ZoomOut, Download, Printer, MoreHorizontal].map((Icon, i) => (
                  <button key={i}><Icon className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
                ))}
              </div>
            </div>
          </div>

          {/* Generated Reports */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold">Generated Reports ({reports.length})</p>
              {/* FIX REP-002: export uses reportId — show button per-report below */}
              {reportId && (
                <button onClick={() => exportPackMut.mutate(reportId)} disabled={exportPackMut.isPending}
                  className="btn-secondary text-xs">
                  {exportPackMut.isPending ? 'Exporting…' : 'Export Latest Compliance Pack'}
                </button>
              )}
            </div>
            {reportsQ.isLoading ? <Spinner /> : reportsQ.error ? (
              <p className="text-xs text-red-500">{(reportsQ.error as Error).message}</p>
            ) : reports.length === 0 ? (
              <p className="text-xs text-slate-400">No reports yet — generate one above</p>
            ) : (
              <div className="space-y-2">
                {reports.map((r: any) => {
                  // FIX: reportId used as string — no inline const in JSX
                  const rIdStr = r.id != null ? String(r.id).substring(0, 12) : r.reportRef ?? '—';
                  return (
                    <div key={r.id} className="p-2 border border-slate-200 rounded bg-slate-50">
                      <div className="flex justify-between">
                        <span className="text-xs font-mono text-slate-700">{rIdStr}</span>
                        <span className={STATUS_BADGE[r.status ?? 'DRAFT'] ?? 'badge-medium'}>{r.status ?? 'DRAFT'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{r.type ?? r.template} · {r.generatedAt ? new Date(r.generatedAt).toLocaleDateString() : r.inspectionDate}</p>
                      <div className="flex gap-2 mt-2">
                        {/* FIX REP-001: download uses /pdf endpoint */}
                        <button onClick={() => handleDownloadPdf(r.id)}
                          className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                          <Download className="w-3 h-3" /> PDF
                        </button>
                        {/* FIX REP-002: per-report compliance pack export */}
                        <button onClick={() => exportPackMut.mutate(r.id)} disabled={exportPackMut.isPending}
                          className="text-xs text-blue-600 hover:underline">
                          Compliance Pack
                        </button>
                        {(r.status === 'GENERATED' || r.status === 'DRAFT') && (
                          <button onClick={() => handleSign(r.id)} className="text-xs text-blue-600 hover:underline">Sign</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CSVUpload.tsx — 4-step ingestion wizard
 * FIXES APPLIED (audit ref):
 *   - AT-021: FormData field 'inspectionType' → 'technique'
 *   - AT-021: tankId now sends numeric PK extracted from business key (T-101 → 101)
 *   - AT-021: column mapping payload converted from Record<string,string>
 *             to [{sourceColumn, timsField, required}] (ColumnMappingEntry[])
 *   - ING-002: validation display now uses normaliseValidation() to handle
 *              backend {valid, warningCount, warningMessage, errors} shape
 *   - ING-002: warning badge + warningMessage displayed correctly
 *   - ING-003: unit error surface unchanged (backend blocks commit via 400)
 */

import { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ingestionApi, type ColumnMappingEntry } from '../services/api';
import { normaliseValidation, type IngestionValidationResult } from '../types/api';
import { Upload, CheckCircle, AlertCircle, Info, Loader, AlertTriangle } from 'lucide-react';

const STEPS = ['Choose tank & technique', 'Upload file(s)', 'Map columns — schema', 'Validate & commit'];

const TIMS_FIELDS = [
  { key: 'reading_id',   label: 'Reading ID *',                required: true },
  { key: 'shell_course', label: 'Shell course *',              required: true },
  { key: 'angle_deg',    label: 'Circumferential angle (°) *', required: true },
  { key: 'height_mm',    label: 'Height from base (mm) *',     required: true },
  { key: 'thickness_mm', label: 'Thickness (mm) *',            required: true },
  { key: 'nominal_mm',   label: 'Nominal thickness (mm)',      required: false },
  { key: 'probe',        label: 'Probe / transducer',          required: false },
  { key: 'inspector_id', label: 'Inspector ID *',              required: true },
  { key: 'temp_c',       label: 'Temperature (°C)',            required: false },
  { key: '',             label: '— ignore —',                  required: false },
];

function parseCSVHeaders(text: string): string[] {
  const firstLine = text.split('\n')[0];
  return firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
}

function parseCSVPreview(text: string, headers: string[]): Record<string, string>[] {
  const lines = text.split('\n').slice(1, 6);
  return lines.filter(Boolean).map(line => {
    const vals = line.split(',');
    return headers.reduce((acc, h, i) => ({ ...acc, [h]: vals[i]?.trim() ?? '' }), {} as Record<string, string>);
  });
}

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach(h => {
    const lower = h.toLowerCase();
    if (lower.includes('point') || lower === 'id')   map[h] = 'reading_id';
    else if (lower.includes('course'))                map[h] = 'shell_course';
    else if (lower.includes('angle'))                 map[h] = 'angle_deg';
    else if (lower.includes('height'))                map[h] = 'height_mm';
    else if (lower.includes('thick') && !lower.includes('nom')) map[h] = 'thickness_mm';
    else if (lower.includes('nom'))                   map[h] = 'nominal_mm';
    else if (lower.includes('probe'))                 map[h] = 'probe';
    else if (lower.includes('operator') || lower.includes('inspector')) map[h] = 'inspector_id';
    else if (lower.includes('temp'))                  map[h] = 'temp_c';
  });
  return map;
}

/** FIX AT-021: Extract numeric PK from business key like 'T-101' → 101.
 *  Falls back to 1 if parsing fails. Backend expects Short integer tankId. */
function extractTankPk(tankBusinessKey: string): number {
  const match = tankBusinessKey.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 1;
}

/** FIX AT-021: Convert Record<string,string> mapping to ColumnMappingEntry[] for backend. */
function toColumnMappingEntries(mapping: Record<string, string>): ColumnMappingEntry[] {
  return Object.entries(mapping)
    .filter(([, timsField]) => timsField !== '')
    .map(([sourceColumn, timsField]) => ({
      sourceColumn,
      timsField,
      required: TIMS_FIELDS.find(f => f.key === timsField)?.required ?? false,
    }));
}

export default function CSVUpload() {
  const [step, setStep] = useState(0);
  const [tankId, setTankId] = useState('T-105');
  const [technique, setTechnique] = useState<string>('UT_SURVEY');
  const [dragOver, setDragOver] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [jobId, setJobId] = useState<string | null>(null);
  const [editionTag, setEditionTag] = useState('');
  const [validation, setValidation] = useState<IngestionValidationResult | null>(null);
  const [committed, setCommitted] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const uploadMut = useMutation({
    mutationFn: (fd: FormData) => ingestionApi.upload(fd),
  });
  const mapMut = useMutation({
    // FIX AT-021: mappings now typed as ColumnMappingEntry[]
    mutationFn: ({ jobId, mappings }: { jobId: string; mappings: ColumnMappingEntry[] }) =>
      ingestionApi.mapColumns(jobId, mappings),
  });
  const validateMut = useMutation({
    mutationFn: (jid: string) => ingestionApi.validate(jid),
  });
  const commitMut = useMutation({
    mutationFn: ({ jobId, editionTag }: { jobId: string; editionTag: string }) =>
      ingestionApi.commit(jobId, editionTag),
  });

  // Poll job status while at step 1 (upload in progress)
  const jobStatusQ = useQuery({
    queryKey: ['ingestion', 'job', jobId, 'status'],
    queryFn: () => ingestionApi.getJobStatus(jobId!),
    enabled: !!jobId && step === 1,
    refetchInterval: 2_000,
  });

  const handleFile = useCallback(async (file: File) => {
    setStepError(null);
    try {
      const text = await file.text();
      const hdrs = parseCSVHeaders(text);
      const rows = parseCSVPreview(text, hdrs);
      setCsvText(text);
      setHeaders(hdrs);
      setPreview(rows);
      setMapping(autoMap(hdrs));

      const fd = new FormData();
      fd.append('file', file);
      // FIX AT-021: backend expects numeric Short tankId, extract from business key
      fd.append('tankId', String(extractTankPk(tankId)));
      // FIX AT-021: field was 'inspectionType' — backend UploadIngestionRequest expects 'technique'
      fd.append('technique', technique);

      const result = await uploadMut.mutateAsync(fd);
      setJobId(result.jobId);
      setStep(2);
    } catch (e: any) {
      setStepError(e?.message ?? 'Upload failed');
    }
  }, [tankId, technique, uploadMut]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleMapSubmit = async () => {
    if (!jobId) return;
    setStepError(null);
    try {
      // FIX AT-021: convert Record to ColumnMappingEntry[] before sending
      const entries = toColumnMappingEntries(mapping);
      await mapMut.mutateAsync({ jobId, mappings: entries });
      const rawResult = await validateMut.mutateAsync(jobId);
      // FIX ING-002: normalise backend response to UI-expected shape
      setValidation(normaliseValidation(rawResult));
      setStep(3);
    } catch (e: any) {
      setStepError(e?.message ?? 'Mapping/validation failed');
    }
  };

  const handleCommit = async () => {
    if (!jobId || !editionTag.trim()) return;
    setStepError(null);
    try {
      await commitMut.mutateAsync({ jobId, editionTag });
      setCommitted(true);
    } catch (e: any) {
      setStepError(e?.message ?? 'Commit failed');
    }
  };

  // FIX ING-002: derive hasError / hasWarning from normalised status
  const hasError = validation?.status === 'ERRORS';
  const hasWarning = validation?.status === 'WARNINGS';
  const busy = uploadMut.isPending || mapMut.isPending || validateMut.isPending || commitMut.isPending;

  return (
    <div className="p-5 animate-page">
      <h1 className="text-xl font-bold text-slate-900 mb-5">Data Ingestion — Upload & Map Inspection Data</h1>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                i < step ? 'bg-emerald-500 border-emerald-500 text-white' :
                i === step ? 'bg-blue-600 border-blue-600 text-white' :
                'bg-white border-slate-300 text-slate-400'
              }`}>{i < step ? '✓' : i + 1}</div>
              <span className={`text-xs font-medium whitespace-nowrap ${i === step ? 'text-blue-600' : i < step ? 'text-emerald-600' : 'text-slate-400'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`w-8 h-0.5 mx-2 ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {stepError && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700">{stepError}</p>
        </div>
      )}

      {/* Step 0: Choose tank + technique */}
      {step === 0 && (
        <div className="flex gap-5">
          <div className="flex-1 tims-card p-5">
            <p className="text-sm font-bold text-blue-600 mb-4">Step 1 of 4 — Choose tank & technique</p>
            <div className="mb-3">
              <p className="field-label mb-1">Tank ID</p>
              <select value={tankId} onChange={e => setTankId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-700 focus:outline-none mb-3">
                {['T-101', 'T-102', 'T-103', 'T-104', 'T-105', 'T-106', 'T-107', 'T-108', 'T-109', 'T-110'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <p className="field-label mb-1">Inspection Technique</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  ['UT_SURVEY', 'UT Survey'], ['MFL_SCAN', 'MFL Scan'],
                  ['VISUAL', 'Visual'], ['EXTERNAL', 'External'],
                ].map(([val, lbl]) => (
                  <button key={val} onClick={() => setTechnique(val)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${technique === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">Tank PK: {extractTankPk(tankId)} (numeric ID sent to backend)</p>
            <button className="btn-primary text-xs" onClick={() => setStep(1)}>Continue →</button>
          </div>
          <div className="tims-card p-4 w-56">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-800">Need help?</p>
                <p className="text-xs text-blue-600 mt-0.5">View data templates and ingestion guide.</p>
                <button className="mt-2 px-3 py-1.5 border border-blue-400 text-blue-700 text-xs font-medium rounded hover:bg-blue-100">View Guide</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Upload file */}
      {step === 1 && (
        <div className="flex gap-5">
          <div className="flex-1 tims-card p-5">
            <p className="text-sm font-bold text-blue-600 mb-4">Step 2 of 4 — Upload file — {tankId} / {technique}</p>
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
              <p className="text-sm font-semibold text-slate-700 mb-1">Drop your CSV inspection file here</p>
              <p className="text-xs text-slate-400">or click to browse · Accepts .csv, .xlsx · Max 50 MB</p>
              <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
            {uploadMut.isPending && <div className="mt-3 text-xs text-blue-600 flex items-center gap-2"><Loader className="w-3 h-3 animate-spin" /> Uploading…</div>}
            {jobStatusQ.data && (
              <div className="mt-3 text-xs text-slate-400">
                Status: <span className="text-blue-600 font-medium">{jobStatusQ.data.status}</span>
                {jobStatusQ.data.progress ? ` · ${jobStatusQ.data.progress}%` : ''}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(0)} className="btn-secondary text-xs">Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === 2 && headers.length > 0 && (
        <div className="flex gap-5">
          <div className="flex-1 tims-card p-5">
            <p className="text-sm font-bold text-blue-600 mb-4">Step 3 of 4 — Map columns</p>
            <div className="flex gap-2 text-xs text-slate-500 mb-3">
              <p className="flex-1 font-medium">Source column (CSV header)</p>
              <div className="w-6" />
              <p className="flex-1 font-medium">TIMS field (required *)</p>
            </div>
            <div className="space-y-2">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-3">
                  <div className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded text-xs text-slate-700 font-mono">{h}</div>
                  <span className="text-slate-400 shrink-0">→</span>
                  <select value={mapping[h] ?? ''} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-blue-300 bg-blue-50 rounded text-xs text-slate-800 focus:outline-none font-medium">
                    {TIMS_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setMapping({})} className="btn-secondary text-xs">Reset mapping</button>
              <button onClick={() => setStep(1)} className="btn-secondary text-xs">Back</button>
              <div className="flex-1" />
              <button onClick={handleMapSubmit} disabled={busy} className="btn-primary text-xs disabled:opacity-50">
                {mapMut.isPending ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Mapping…</> : validateMut.isPending ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Validating…</> : 'Validate & Continue →'}
              </button>
            </div>
          </div>

          <div className="w-72 shrink-0 tims-card p-4">
            <p className="text-sm font-bold text-slate-700 mb-3">Preview (first 5 rows)</p>
            <div className="overflow-auto">
              <table className="tims-table w-full">
                <thead><tr>{headers.slice(0, 6).map(h => <th key={h} className="text-[10px]">{h}</th>)}</tr></thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>{headers.slice(0, 6).map(h => <td key={h} className="text-[10px]">{row[h]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            {jobId && <p className="text-[10px] text-slate-400 mt-2">Job ID: {jobId}</p>}
          </div>
        </div>
      )}

      {/* Step 3: Validate & commit */}
      {step === 3 && (
        <div className="flex gap-5">
          <div className="flex-1 tims-card p-5">
            <p className="text-sm font-bold text-blue-600 mb-4">Step 4 of 4 — Validate & Commit</p>
            {committed ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-800 mb-1">Dataset committed successfully!</p>
                <p className="text-sm text-slate-500">Assessment recalculated · Alerts dispatched · Audit entry written</p>
                <p className="text-xs text-slate-400 mt-1">Edition tag: <strong>{editionTag}</strong></p>
                <button onClick={() => { setStep(0); setJobId(null); setCommitted(false); setHeaders([]); setEditionTag(''); setValidation(null); }} className="btn-primary text-sm mt-5">
                  Upload Another File
                </button>
              </div>
            ) : (
              <>
                {validateMut.isPending && <div className="flex items-center gap-2 text-sm text-blue-600 mb-4"><Loader className="w-4 h-4 animate-spin" /> Running validation checks…</div>}

                {validation && (
                  <>
                    {/* FIX ING-002: warning badge shows warningMessage from backend */}
                    {hasWarning && (
                      <div className="bg-amber-50 border border-amber-200 rounded px-3.5 py-2.5 mb-3 text-xs text-amber-700">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-bold">⚠ Validation warnings ({validation.warningCount ?? 0})</span>
                          <span className="ml-auto bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">WARNINGS</span>
                        </div>
                        {validation.warningMessage && <p className="ml-5">{validation.warningMessage}</p>}
                        <p className="ml-5 mt-1">Commit is allowed. Flagged readings will appear in the defect register.</p>
                      </div>
                    )}
                    {hasError && (
                      <div className="bg-red-50 border border-red-200 rounded px-3.5 py-2.5 mb-3 text-xs text-red-700">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-bold">✕ Validation errors</span>
                          <span className="ml-auto bg-red-200 text-red-800 px-1.5 py-0.5 rounded text-[10px] font-bold">BLOCKED</span>
                        </div>
                        <p>Commit is blocked. Fix errors and re-upload.</p>
                        {validation.errors && validation.errors.length > 0 && (
                          <ul className="mt-1 ml-4 space-y-0.5 list-disc">
                            {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="flex gap-4 text-[11px] text-slate-400 mb-3">
                      <span>Total rows: <strong className="text-slate-700">{validation.totalRows}</strong></span>
                      <span>Duplicates: <strong className="text-slate-700">{validation.duplicates}</strong></span>
                      <span>Out-of-range: <strong className="text-slate-700">{validation.outOfRange}</strong></span>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      {validation.checks.map((check, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={check.passed ? (check.warning ? 'text-amber-500' : 'text-emerald-500') : 'text-red-500'}>
                            {check.passed
                              ? (check.warning ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5" /> : <CheckCircle className="w-3.5 h-3.5 mt-0.5" />)
                              : '✕'}
                          </span>
                          <span className="text-xs text-slate-600">{check.label}</span>
                          {check.detail && <span className="text-[10px] text-slate-400">({check.detail})</span>}
                        </div>
                      ))}
                    </div>

                    {!hasError && (
                      <div className="mb-4">
                        <p className="field-label mb-1">Edition Tag <span className="text-red-500">*</span></p>
                        <input
                          className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500"
                          placeholder="e.g. UT_T105_Apr26"
                          value={editionTag}
                          onChange={e => setEditionTag(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}

                <p className="text-[11px] text-slate-400 italic mb-4">On commit: dataset locks, audit entry written, assessment recalculated, alerts dispatched.</p>
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="btn-secondary text-xs">Back</button>
                  <button onClick={handleCommit} disabled={hasError || !editionTag.trim() || busy} className="btn-primary text-xs disabled:opacity-50">
                    {commitMut.isPending ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Committing…</> : hasWarning ? 'Commit with Warnings' : 'Commit Dataset'}
                  </button>
                </div>
              </>
            )}
          </div>

          {validation && !committed && (
            <div className="w-72 shrink-0 tims-card p-4">
              <p className="text-sm font-bold text-slate-700 mb-3">Preview (first 5 rows)</p>
              <div className="overflow-auto">
                {validation.previewRows.length > 0 ? (
                  <table className="tims-table w-full text-[10px]">
                    <thead><tr>{Object.keys(validation.previewRows[0] ?? {}).slice(0, 5).map(k => <th key={k}>{k}</th>)}</tr></thead>
                    <tbody>
                      {validation.previewRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>{Object.values(row).slice(0, 5).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-[10px] text-slate-400">No preview data</p>}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Reference: EEMUA 159 §5.2.4</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 text-center text-[11px] text-slate-400">
        All inspections are managed in accordance with EEMUA 159 Ed.6 unless stated otherwise.
      </div>
    </div>
  );
}

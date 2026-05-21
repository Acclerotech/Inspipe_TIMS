/**
 * CSVUpload.tsx — FIXED VERSION WITH STRUCTURAL EXTRACTION, LOGGING, & UX CRITERIA
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ingestionApi, dashboardApi, type ColumnMappingEntry } from '../services/api'; 
import { normaliseValidation, type IngestionValidationResult } from '../types/api';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Info,
  Loader,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';

const STEPS = [
  'Choose tank & technique',
  'Upload file(s)',
  'Map columns — schema',
  'Validate & commit',
];

const TIMS_FIELDS = [
  { key: 'reading_id', label: 'Reading ID *', required: true },
  { key: 'shell_course', label: 'Shell course *', required: true },
  { key: 'angle_deg', label: 'Circumferential angle (°) *', required: true },
  { key: 'height_mm', label: 'Height from base (mm) *', required: true },
  { key: 'thickness_mm', label: 'Thickness (mm) *', required: true },
  { key: 'nominal_mm', label: 'Nominal thickness (mm)', required: false },
  { key: 'probe', label: 'Probe / transducer', required: false },
  { key: 'inspector_id', label: 'Inspector ID *', required: true },
  { key: 'temp_c', label: 'Temperature (°C)', required: false },
  { key: '', label: '— ignore —', required: false },
];

function parseCSVHeaders(text: string): string[] {
  const firstLine = text.split('\n')[0] ?? '';
  return firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
}

function parseCSVPreview(text: string, headers: string[]): Record<string, string>[] {
  const lines = text.split('\n').slice(1, 6).filter(line => line.trim().length > 0);
  return lines.map(line => {
    const vals = line.split(',');
    return headers.reduce((acc, h, i) => ({ ...acc, [h]: vals[i]?.trim() ?? '' }), {} as Record<string, string>);
  });
}

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach(h => {
    const lower = h.toLowerCase();
    if (lower.includes('point') || lower === 'id') map[h] = 'reading_id';
    else if (lower.includes('course')) map[h] = 'shell_course';
    else if (lower.includes('angle')) map[h] = 'angle_deg';
    else if (lower.includes('height')) map[h] = 'height_mm';
    else if (lower.includes('thick') && !lower.includes('nom')) map[h] = 'thickness_mm';
    else if (lower.includes('nom')) map[h] = 'nominal_mm';
    else if (lower.includes('probe')) map[h] = 'probe';
    else if (lower.includes('operator') || lower.includes('inspector')) map[h] = 'inspector_id';
    else if (lower.includes('temp')) map[h] = 'temp_c';
  });
  return map;
}

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
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [tankId, setTankId] = useState(''); 
  const [technique, setTechnique] = useState<string>('UT');
  const [searchParams] = useSearchParams();
  const urlJobId = searchParams.get('jobId');
  const [dragOver, setDragOver] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [jobId, setJobId] = useState<string | null>(null);
  const [editionTag, setEditionTag] = useState('');
  const [validation, setValidation] = useState<IngestionValidationResult | null>(null);
  const [committed, setCommitted] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isJobIdValid = !!jobId && jobId !== '[object Object]';

  // Fetch dynamic tank list
  const tanksListQ = useQuery({
    queryKey: ['tanks-list'],
    queryFn: () => dashboardApi.getTanks({ size: 200 }),
  });

  const tanksList = tanksListQ.data?.content || tanksListQ.data || [];

  // Auto-select the first tank once loaded if empty
  useEffect(() => {
    if (!tankId && tanksList.length > 0) {
      setTankId(tanksList[0].tankId);
    }
  }, [tanksList, tankId]);


  // 🔥 FIX: Update uploadMut to accept both fd and existing jobId
  const uploadMut = useMutation({
    mutationFn: ({ fd, existingJobId }: { fd: FormData; existingJobId: string | null }) => 
      ingestionApi.upload(fd, existingJobId),
  });

  const mapMut = useMutation({
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

  const jobStatusQ = useQuery({
    queryKey: ['ingestion', 'job', jobId, 'status'],
    queryFn: () => {
      if (!jobId || jobId === '[object Object]') {
        return Promise.reject(new Error('Poller block: Invalid state key format detected.'));
      }
      return ingestionApi.getJobStatus(jobId);
    },
    enabled: isJobIdValid && !committed,
    refetchInterval: isJobIdValid && !committed ? 2000 : false,
  });

  const previewQ = useQuery({
    queryKey: ['ingestion', 'job', urlJobId, 'preview'],
    queryFn: () => ingestionApi.getJobPreview(urlJobId!),
    enabled: !!urlJobId,
  });

  useEffect(() => {
    // Safety check: only run if the query actually finished successfully
    if (urlJobId && previewQ.data) {
      console.log('[DEBUG] Loading data for retry:', previewQ.data);
      
      setJobId(urlJobId);
      
      // Safely extract data
      const fetchedHeaders = previewQ.data.columnNames || [];
      const fetchedPreview = previewQ.data.sampleRows || [];
      
      setHeaders(fetchedHeaders);
      setPreview(fetchedPreview);
      setMapping(autoMap(fetchedHeaders));
      
      // Jump to Mapping step only if we have data
      if (fetchedHeaders.length > 0) {
        setStep(2); 
      }
    }
  }, [urlJobId, previewQ.data]);


  const handleFile = useCallback(
    async (file: File) => {
      setStepError(null);
      try {
        if (!file.name.toLowerCase().endsWith('.csv')) {
          throw new Error('Only CSV files are currently supported.');
        }

        const text = await file.text();
        const hdrs = parseCSVHeaders(text);
        if (hdrs.length === 0) throw new Error('Unable to read CSV headers.');

        const rows = parseCSVPreview(text, hdrs);
        const totalRows = text.split('\n').filter(line => line.trim().length > 0).length - 1;

        setHeaders(hdrs);
        setPreview(rows);
        setMapping(autoMap(hdrs));

        const metadata = { tankId, technique, sourceFilename: file.name, totalRows };
        const fd = new FormData();
        fd.append('file', file);
        fd.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

        // 🔥 FIX: Pass the current jobId into the mutation to trigger an Update
        const result = await uploadMut.mutateAsync({ fd, existingJobId: jobId });
        console.log('[DEBUG] Raw Upload Response:', result);

        let extractedId: string | null = null;
        if (result && typeof result === 'object') {
          if ('id' in result && result.id !== undefined && result.id !== null) {
            extractedId = String(result.id);
          } else if ('jobId' in result && result.jobId !== undefined && result.jobId !== null) {
            extractedId = String(result.jobId);
          }
        } else if (typeof result === 'string' || typeof result === 'number') {
          extractedId = String(result);
        }

        if (!extractedId || extractedId === '[object Object]') {
          console.error('[CRITICAL] Parsing failed to resolve clean identifier. Received:', result);
          throw new Error('Server response mismatch: Valid numeric ID key not found.');
        }

        console.log('[DEBUG] Extracted Job ID String:', extractedId);
        setJobId(extractedId);
        setStep(2);
      } catch (e: any) {
        setStepError(e?.message ?? 'Upload failed');
      }
    },
    [tankId, technique, jobId, uploadMut] // Added jobId to dependency array
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleMapSubmit = async () => {
    if (!isJobIdValid) {
      setStepError('Action blocked: Active target Job ID missing or malformed.');
      return;
    }

    setStepError(null);
    try {
      const missingRequired = TIMS_FIELDS.filter(f => f.required).filter(f => !Object.values(mapping).includes(f.key));
      if (missingRequired.length > 0) {
        throw new Error(`Missing required mappings: ${missingRequired.map(f => f.label).join(', ')}`);
      }

      const entries = toColumnMappingEntries(mapping);
      
      console.log('[DEBUG] Map Columns Request Payload:', { jobId, mappings: entries });
      await mapMut.mutateAsync({ jobId: jobId!, mappings: entries });

      console.log('[DEBUG] Executing Validation Phase for Job ID:', jobId);
      const rawResult = await validateMut.mutateAsync(jobId!);
      
      console.log('[DEBUG] Validate Response Output:', rawResult);
      setValidation(normaliseValidation(rawResult));
      setStep(3);
    } catch (e: any) {
      setStepError(e?.message ?? 'Mapping/validation failed');
    }
  };

  const handleCommit = async () => {
    if (!isJobIdValid || !editionTag.trim()) return;
    setStepError(null);

    try {
      console.log('[DEBUG] Commit Request Payload:', { jobId, editionTag });
      await commitMut.mutateAsync({ jobId: jobId!, editionTag });
      
      console.log('[DEBUG] Commit Lifecycle Finished Successfully.');
      setCommitted(true);
    } catch (e: any) {
      setStepError(e?.message ?? 'Commit failed');
    }
  };

  const hasError = validation?.status === 'ERRORS';
  const hasWarning = validation?.status === 'WARNINGS';
  const busy = uploadMut.isPending || mapMut.isPending || validateMut.isPending || commitMut.isPending;

  return (
    <div className="p-5 animate-page">
      
      {/* Header layout with Back to Dashboard button */}
      <div className="flex items-center gap-4 mb-5">
        <button 
          onClick={() => navigate('/jobs')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          title="Back to Job Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">
          Data Ingestion — Upload & Map Inspection Data
        </h1>
      </div>

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
            
            {/* DYNAMIC TANK DROPDOWN */}
            <div className="mb-3">
              <p className="field-label mb-1">Tank ID</p>
              <select 
                value={tankId} 
                onChange={e => setTankId(e.target.value)}
                disabled={tanksListQ.isLoading}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-700 focus:outline-none mb-3 disabled:opacity-50"
              >
                {tanksListQ.isLoading ? (
                  <option value="">Loading tanks...</option>
                ) : tanksList.length === 0 ? (
                  <option value="">No tanks found</option>
                ) : (
                  tanksList.map((t: any) => (
                    <option key={t.tankId} value={t.tankId}>
                      {t.tankId} {t.siteName ? `(${t.siteName})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="mb-4">
              <p className="field-label mb-1">Inspection Technique</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  ['UT', 'UT Survey'],
                  ['MFL', 'MFL Scan'],
                  ['VISUAL', 'Visual'],
                  ['SETTLEMENT', 'Settlement'],
                  ['OTHER', 'Other'],
                ].map(([val, lbl]) => (
                  <button key={val} onClick={() => setTechnique(val)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                      technique === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}>{lbl}</button>
                ))}
              </div>
            </div>
            <button 
              className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={() => setStep(1)}
              disabled={!tankId || tanksListQ.isLoading}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Upload file */}
      {step === 1 && (
        <div className="flex gap-5">
          <div className="flex-1 tims-card p-5">
            <p className="text-sm font-bold text-blue-600 mb-4">Step 2 of 4 — Upload file — {tankId} / {technique}</p>
            <div className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
              <p className="text-sm font-semibold text-slate-700 mb-1">Drop your CSV inspection file here</p>
              <p className="text-xs text-slate-400">or click to browse · Accepts .csv · Max 50 MB</p>
              <input ref={inputRef} type="file" accept=".csv" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
            {uploadMut.isPending && <div className="mt-3 text-xs text-blue-600 flex items-center gap-2"><Loader className="w-3 h-3 animate-spin" /> Uploading…</div>}
            {jobStatusQ.data && (
              <div className="mt-3 text-xs text-slate-400">
                Status: <span className="text-blue-600 font-medium">{jobStatusQ.data.status}</span>
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
              <button onClick={() => setStep(1)} className="btn-secondary text-xs">Back</button>
              <div className="flex-1" />
              <button onClick={handleMapSubmit} disabled={busy} className="btn-primary text-xs disabled:opacity-50">
                {busy ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Processing…</> : 'Validate & Continue →'}
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
            {isJobIdValid && <p className="text-[10px] text-slate-400 mt-2">Job ID: {jobId}</p>}
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
                <button onClick={() => { setStep(0); setJobId(null); setCommitted(false); setHeaders([]); setEditionTag(''); setValidation(null); }} className="btn-primary text-sm mt-5">
                  Upload Another File
                </button>
              </div>
            ) : (
              <>
                {validation && (
                  <>
                    {hasWarning && (
                      <div className="bg-amber-50 border border-amber-200 rounded px-4 py-3 mb-4 text-sm text-amber-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-bold">⚠ Validation Warnings ({validation.warningCount ?? 0})</span>
                        </div>
                        {validation.warningMessage && <p className="ml-6 mb-2 text-xs">{validation.warningMessage}</p>}
                        
                        <div className="ml-6 mt-3 flex items-start gap-2 bg-amber-100/50 p-2 rounded border border-amber-200">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs">
                            <strong>Note:</strong> Abnormal readings (e.g. thickness below retirement thresholds) have been flagged. 
                            <strong> No data will be silently dropped.</strong> Upon commit, these readings will be logged in the defect register for further review.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {hasError && (
                      <div className="bg-red-50 border border-red-200 rounded px-4 py-3 mb-4 text-sm text-red-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span className="font-bold">✕ Validation Errors Blocked Commit</span>
                        </div>
                        
                        <ul className="list-disc ml-10 mb-3 space-y-1 text-xs">
                          {validation.errors?.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>

                        <div className="ml-6 mt-3 flex items-start gap-2 bg-red-100 p-2 rounded border border-red-200">
                          <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <p className="text-xs">
                            <strong>Action Required:</strong> A data format or unit mismatch was detected (e.g., expecting mm but received inches). 
                            Please go back to Step 3 and double-check your <strong>column-unit settings</strong>, or fix the source file and re-upload.
                          </p>
                        </div>
                      </div>
                    )}

                    {!hasError && (
                      <div className="mb-4 mt-2">
                        <p className="field-label mb-1 font-semibold text-slate-700">Edition Tag <span className="text-red-500">*</span></p>
                        <input className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                          placeholder="e.g. UT_T105_Apr26" value={editionTag} onChange={e => setEditionTag(e.target.value)} />
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 mt-6 border-t border-slate-100 pt-4">
                  <button onClick={() => setStep(2)} className="btn-secondary text-sm px-4 py-2">Back to Mapping</button>
                  <button onClick={handleCommit} disabled={hasError || !editionTag.trim() || busy} className="btn-primary text-sm px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {commitMut.isPending ? 'Committing…' : hasWarning ? 'Acknowledge & Commit' : 'Commit Dataset'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
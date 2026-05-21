/**
 * services/api.ts — Unified API service layer
 * FIXES APPLIED (audit ref):
 *   - tankApi.getAuditLog:       /tanks/{id}/audit  →  /tanks/{id}/audit-log          (AUD-002)
 *   - tankApi.reopen:            /tanks/{id}/reopen →  /inspections/{id}/reopen       (AUD-001)
 *   - heatmapApi:                missing endpoints  → /heatmap/defects/tank/{id}      (VIZ-001)
 *   - ingestionApi.mapColumns:   Record payload     → [{sourceColumn,timsField,required}] (AT-021)
 *   - reportApi.create:          mismatched shape   → backend CreateReportRequest     (REP-001)
 *   - reportApi.exportCompliancePack: wrong path    → /reports/{id}/compliance-pack  (REP-002)
 *   - reportApi.downloadPdf:     /download          → /pdf                           (REP-001)
 *   - calculationApi:            new — breakdown + override endpoints                (CALC-001..003)
 */

import { ReportDto } from '../api';
import { api } from '../api/client';

// ── Column mapping payload type (backend ColumnMappingRequest) ────────────────
export interface ColumnMappingEntry {
  sourceColumn: string;
  timsField: string;
  required: boolean;
}

export interface IngestionPreviewResponse {
  jobId: number;
  sourceFilename: string;
  totalRows: number;
  columnNames: string[];       // MATCHES BACKEND
  sampleRows: Record<string, any>[]; // MATCHES BACKEND
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getMetrics: () => api.get<any>('/dashboard/metrics'),

  getTanks: (params?: { site?: string; risk?: string; page?: number; size?: number }) => {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.site) qs.set('site', p.site);
    if (p.risk) qs.set('risk', p.risk);
    qs.set('page', String(p.page ?? 0));
    qs.set('size', String(p.size ?? 100));
    return api.get<any>(`/dashboard/tanks?${qs.toString()}`);
  },

  getActivityFeed: () => api.get<any>('/dashboard/activity'),
};

// ── Site plan ─────────────────────────────────────────────────────────────────
export const sitePlanApi = {
  get: () => api.get<any[]>('/dashboard/site-plan'),
};

// ── Tank ──────────────────────────────────────────────────────────────────────
export const tankApi = {
  getDetail: (tankId: string) =>
    api.get<any>(`/tanks/${encodeURIComponent(tankId)}`),

  getDefects: (tankId: string, page = 0, size = 50) =>
    api.get<any>(`/tanks/${encodeURIComponent(tankId)}/defects?page=${page}&size=${size}`)
       .then((res: any) => res?.content ?? res ?? []),

  getCorrosion: (tankId: string) =>
    api.get<any>(`/tanks/${encodeURIComponent(tankId)}/corrosion`),

  getThicknessHistory: (tankId: string) =>
    api.get<any>(`/tanks/${encodeURIComponent(tankId)}/thickness-history`)
       .then((res: any) => res?.content ?? res ?? []),

  getInspections: (tankId: string) =>
    api.get<any>(`/tanks/${encodeURIComponent(tankId)}/inspections`)
       .then((res: any) => res?.content ?? res ?? []),

  // FIX AUD-002: was /tanks/{id}/audit — backend endpoint is /tanks/{id}/audit-log
  getAuditLog: (tankId: string) =>
    api.get<any>(`/tanks/${encodeURIComponent(tankId)}/audit-log`)
       .then((res: any) => res?.content ?? res ?? []),

  getIndicators: (tankId: string) =>
    api.get<any>(`/tanks/${encodeURIComponent(tankId)}/indicators`).catch(() => null),

  getDocuments: (tankId: string) =>
    api.get<any>(`/tanks/${encodeURIComponent(tankId)}/documents`)
       .then((res: any) => res?.content ?? res ?? [])
       .catch(() => []),

  // FIX AUD-001: was /tanks/{tankId}/reopen — backend only has /inspections/{id}/reopen
  reopen: (inspectionId: string, reason: string) =>
    api.post<void>(`/inspections/${encodeURIComponent(inspectionId)}/reopen`, { reason }),
};

// ── Heatmap ───────────────────────────────────────────────────────────────────
// FIX VIZ-001: /heatmap/{tankId}/timeline and /heatmap/{tankId}/readings do NOT exist.
// Backend only has GET /heatmap/defects/tank/{tankId}.
export const heatmapApi = {
  /** Derives year timeline from defect firstDetected dates via available backend endpoint. */
  getTimeline: async (tankId: string): Promise<Array<{ datasetId: string; label: string; date: string }>> => {
    const defects: any[] = await api.get<any>(
      `/heatmap/defects/tank/${encodeURIComponent(tankId)}?page=0&size=200`
    ).then((res: any) => res?.content ?? res ?? []).catch(() => []);

    const yearsSet = new Set<string>();
    defects.forEach((d: any) => {
      const dateStr = d.firstDetected ?? d.firstDetectedDate ?? d.observedAt ?? '';
      if (dateStr) yearsSet.add(String(dateStr).substring(0, 4));
    });

    const years = Array.from(yearsSet).sort();
    if (years.length === 0) {
      return [{ datasetId: 'current', label: String(new Date().getFullYear()), date: new Date().toISOString() }];
    }
    return years.map(y => ({ datasetId: y, label: y, date: `${y}-01-01` }));
  },

  /** Returns defects for D3FloorHeatmap normalised from backend heatmap response. */
  getReadings: (tankId: string, _datasetId?: string) =>
    api.get<any>(
      `/heatmap/defects/tank/${encodeURIComponent(tankId)}?page=0&size=200`
    ).then((res: any) => res?.content ?? res ?? []).catch(() => []),
};

// ── Inspection / Calendar ─────────────────────────────────────────────────────
export const inspectionApi = {
  updateStatus: (id: string, status: string) =>
    api.patch<void>(`/inspections/${id}/status`, { status }),

  create: (body: any) => api.post<any>('/inspections', body),

  log: (body: any) => api.post<any>('/inspections/log', body),
};

export const calendarApi = {
  getEvents: (params?: { site?: string; type?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.site) qs.set('site', params.site);
    if (params?.type) qs.set('type', params.type);
    if (params?.from) qs.set('from', params.from);
    if (params?.to)   qs.set('to', params.to);
    qs.set('page', '0');
    qs.set('size', '200');
    return api.get<any>(`/inspections/calendar?${qs.toString()}`)
              .then((res: any) => res?.content ?? res ?? []);
  },

  getConflicts: () =>
    api.get<any[]>('/inspections/conflicts')
       .then((res: any) => res?.content ?? res ?? []),

  generateWorkpack: (inspectionId: string) =>
    api.post<any>(`/inspections/${inspectionId}/workpack`),
};

// ── Reports ───────────────────────────────────────────────────────────────────
// Template / standard ID maps aligned to backend Byte/Short PKs
export const TEMPLATE_IDS: Record<string, number> = { WSE: 1, FFS: 2, ISE: 3 };
export const STANDARD_IDS: Record<string, number> = { 'EEMUA 159 Ed.6': 1, 'EEMUA 159 Ed.5': 2 };

export interface BackendCreateReportRequest {
  tankId: string;
  templateId: number;      // backend: Byte
  standardId: number;      // backend: Short
  reportRef: string;
  inspectionDate: string;
  sectionNames: string[];
  signatories: Array<{ userId: number; role: string }>;
}

export const reportApi = {
  getAll: () =>
    api.get<any>('/reports?page=0&size=20')
       .then((res: any) => res?.content ?? res ?? []),
// Add this new method:
// ── WORKFLOW: Update Report Status ──
  updateStatus: (reportId: string | number, status: string) =>
    api.patch<any>(`/reports/${reportId}/status`, { status }),
  // FIX REP-001: aligned payload to backend CreateReportRequest
  create: (body: BackendCreateReportRequest) => api.post<any>('/reports', body),

  sign: (
  reportId: string,
  mfaToken: string
) => api.post<ReportDto>(
  `/reports/${reportId}/sign`,
  { mfaToken }
),

  
  // FIX REP-001: was /download — backend exposes /pdf
  downloadPdf: (reportId: string | number) =>
    fetch(`/api/reports/${reportId}/pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('tims_token') ?? ''}` },
    }).then(res => {
      if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
      return res.blob();
    }),

  // FIX REP-002: was /api/tanks/{tankId}/compliance-pack — backend is /api/reports/{reportId}/compliance-pack
  exportCompliancePack: (reportId: string | number) =>
    fetch(`/api/reports/${encodeURIComponent(String(reportId))}/compliance-pack`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('tims_token') ?? ''}` },
    }).then(res => {
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      return res.blob();
    }),
};

// ── Calculations ──────────────────────────────────────────────────────────────
// FIX CALC-001/002/003: add calculation API
export const calculationApi = {
  getBreakdown: (tankId: string) =>
    api.get<any>(`/calculations/${encodeURIComponent(tankId)}/breakdown`).catch(() => null),

  computeCorrosion: (tankId: string) =>
    api.post<any>('/calculations/corrosion', { tankId }),

  computeRemainingLife: (tankId: string) =>
    api.post<any>('/calculations/remaining-life', { tankId }),

  applyOverride: (data: {
  tankId: string;
  overrideAllowanceMm: number;
  reason: string;
}) =>
  api.post('/calculations/override', data),
};

// ── Data Ingestion ────────────────────────────────────────────────────────────
export const ingestionApi = {
  upload: (formData: FormData, existingJobId?: string | null) => {
    const url = existingJobId 
      ? `/api/ingestion/upload?jobId=${existingJobId}` 
      : '/api/ingestion/upload';
      
    return fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('tims_token') ?? ''}` },
      body: formData,
    }).then(async res => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Upload failed: ${res.status}`);
      }
      return res.json() as Promise<{ id: string; jobId: string; totalRows: number }>;
    });
  },

  mapColumns: (jobId: string, mappings: ColumnMappingEntry[]) =>
    api.post<void>(`/ingestion/${jobId}/map-columns`, { mappings }),

  validate: (jobId: string) =>
    api.post<any>(`/ingestion/${jobId}/validate`),

  commit: (jobId: string, editionTag: string) =>
    api.post<void>(`/ingestion/${jobId}/commit`, { editionTag }),

  getJobStatus: (jobId: string) =>
    api.get<any>(`/ingestion/jobs/${jobId}/status`),

  // 🔥 FIX: Uses the strictly typed response
  getJobPreview: (jobId: string | number) =>
    api.get<IngestionPreviewResponse>(`/ingestion/jobs/${jobId}/preview`),
    
  getJobs: (page = 0, size = 50) =>
    api.get<any>(`/jobs?page=${page}&size=${size}`).then(res => res?.content ?? res ?? []),

  retryJob: (jobId: string | number) =>
    api.post<any>(`/jobs/retry/${jobId}`),
};
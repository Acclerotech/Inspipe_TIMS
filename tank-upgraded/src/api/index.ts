// ── All API calls in one place ─────────────────────────────────────────────────
import { api, setToken } from './client';
import type {
  Page, TankFleetSummaryDto, DashboardMetricsDto, TankDetailDto,
  DefectDto, CorrosionAssessmentDto, ThicknessHistoryDto,
  InspectionCalendarDto, CreateInspectionRequest, UpdateInspectionStatusRequest,
  HeatmapDto, ReportDto, CreateReportRequest, SignReportRequest,
  UploadIngestionRequest, ColumnMappingDto, IngestionJobDto,
  DevTokenRequest, TokenResponse,DashboardActivityDto,InspectionAlertDto,
SitePlanDto,
} from './types';


export interface DevLoginResponse {
  accessToken: string;
  tokenType: string;
}
export function devLogin(email: string): Promise<DevLoginResponse> {
  return api.post<DevLoginResponse>('/auth/login', {
    email
  });
}


// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getFleetSummary = (
  page = 0,
  size = 50,
  filters?: {
    riskCategory?: string
    complianceStatus?: string
  }
) => {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (filters?.riskCategory) {
    params.append('riskCategory', filters.riskCategory)
  }

  if (filters?.complianceStatus) {
    params.append('complianceStatus', filters.complianceStatus)
  }

  return api.get<Page<TankFleetSummaryDto>>(
    `/dashboard/tanks?${params.toString()}`
  )
}
// export const getFleetSummary = (page = 0, size = 50) =>
//   api.get<Page<TankFleetSummaryDto>>(
//     `/dashboard/tanks?page=${page}&size=${size}`
//   );

export const getDashboardMetrics = () =>
  api.get<DashboardMetricsDto>('/dashboard/metrics');

export const getRecentActivity = () =>
  api.get<DashboardActivityDto[]>('/dashboard/activity');

export const getSitePlan = () =>
  api.get<SitePlanDto[]>('/dashboard/site-plan');
// ── Tanks ─────────────────────────────────────────────────────────────────────
export const getTankDetail = (tankId: string) =>
  api.get<TankDetailDto>(`/tanks/${tankId}`);

export const getTankDefects = (tankId: string, page = 0, size = 20) =>
  api.get<Page<DefectDto>>(`/tanks/${tankId}/defects?page=${page}&size=${size}`);

export const getTankCorrosion = (tankId: string) =>
  api.get<CorrosionAssessmentDto[]>(`/tanks/${tankId}/corrosion`);

export const getTankThickness = (tankId: string) =>
  api.get<ThicknessHistoryDto[]>(`/tanks/${tankId}/thickness-history`);

// ── Inspections / Planner ─────────────────────────────────────────────────────
export const getInspectionCalendar = (page = 0, size = 100) =>
  api.get<Page<InspectionCalendarDto>>(`/inspections/calendar?page=${page}&size=${size}`);

export const createInspection = (body: CreateInspectionRequest) =>
  api.post<number>('/inspections', body);

export const updateInspectionStatus = (id: number, body: UpdateInspectionStatusRequest) =>
  api.patch<void>(`/inspections/${id}/status`, body);

// ── Heatmap ───────────────────────────────────────────────────────────────────
export const getHeatmapDefects = (page = 0, size = 200) =>
  api.get<Page<HeatmapDto>>(`/heatmap/defects?page=${page}&size=${size}`);

// ── Reports ───────────────────────────────────────────────────────────────────
export const getReports = (page = 0, size = 20) =>
  api.get<Page<ReportDto>>(`/reports?page=${page}&size=${size}`);

export const createReport = (body: CreateReportRequest) =>
  api.post<ReportDto>('/reports', body);

export const signReport = (id: number, body: SignReportRequest) =>
  api.post<void>(`/reports/${id}/sign`, body);

// ── Tank Overview / Indicators ───────────────────────────────────────────────
export const getTankIndicators = (tankId: string) =>
  api.get(`/tanks/${tankId}/indicators`);

export const getTankDocuments = (tankId: string) =>
  api.get(`/tanks/${tankId}/documents`);
// ── Ingestion ─────────────────────────────────────────────────────────────────
export const uploadIngestionJob = (body: UploadIngestionRequest) =>
  api.post<IngestionJobDto>('/ingestion/upload', body);

export const mapIngestionColumns = (jobId: number, mappings: ColumnMappingDto[]) =>
  api.post<void>(`/ingestion/${jobId}/map-columns`, mappings);

export const validateIngestionJob = (jobId: number) =>
  api.post<void>(`/ingestion/${jobId}/validate`);

export const commitIngestionJob = (jobId: number) =>
  api.post<void>(`/ingestion/${jobId}/commit`);
// Inside index.ts (add this under the ── Ingestion ── section)

export const getIngestionJobs = (page = 0, size = 50) =>
  api.get<Page<IngestionJobDto>>(`/jobs?page=${page}&size=${size}`);

export const retryIngestionJob = (jobId: number) =>
  api.post<IngestionJobDto>(`/jobs/retry/${jobId}`);
// ── Alerts ──────────────────────────────────────────────────────────────────

export const getAlerts = (
  page = 0,
  size = 20,
  unreadOnly?: boolean
) => {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (unreadOnly !== undefined) {
    params.append('unreadOnly', String(unreadOnly));
  }

  return api.get<Page<InspectionAlertDto>>(
    `/alerts?${params.toString()}`
  );
};

export const getUnreadAlerts = (
  page = 0,
  size = 20
) =>
  api.get<Page<InspectionAlertDto>>(
    `/alerts/unread?page=${page}&size=${size}`
  );

export const acknowledgeAlert = (id: number) =>
  api.patch(`/alerts/${id}/acknowledge`);

export const bulkAcknowledgeAlerts = (ids: number[]) =>
  api.post('/alerts/acknowledge', ids);

export type {
  Page, TankFleetSummaryDto, DashboardMetricsDto, TankDetailDto,
  DefectDto, CorrosionAssessmentDto, ThicknessHistoryDto,
  InspectionCalendarDto, HeatmapDto, ReportDto, IngestionJobDto,
  ColumnMappingDto,InspectionAlertDto,DashboardActivityDto,
};

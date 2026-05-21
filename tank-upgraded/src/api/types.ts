// ── Exact mirror of com.acclero.tims.dto.ApiDtos ─────────────────────────────

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;      // current page (0-based)
  size: number;
}
interface AuthContextValue {
  loggedIn: boolean;
  user: { email: string; roles?: string[] } | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

// Add to src/types.ts


// Dashboard
export interface TankFleetSummaryDto {
  tankId: string;
  siteName: string;
  service: string;
  riskCategory: string;          // HIGH | MEDIUM | LOW
  complianceStatus: string;      // COMPLIANT | ACTION_REQUIRED | OVERDUE
  remainingLifeYr: number;
  corrosionRate: number;
  nextInspectionDue: string;     // ISO date
  lastInspectionDate: string;
  lastInspectionType: string;
  openDefects: number;
}
export interface TankIndicatorsDto {
  minShellThickness: number;
  maxCorrosionRate: number;
  maxSettlement: number;
}
export interface TankDocumentDto {
  id: number;
  name: string;
  uploadedAt: string;
  url: string;
}
export interface DashboardMetricsDto {
  totalTanks: number;
  openDefects: number;
  overdueInspections: number;
}

// Tank detail
export interface TankDetailDto {
  tankId: string;
  siteName: string;
  service: string;
  riskCategory: string;
  operationalStatus: string;     // IN_SERVICE | OUT_OF_SERVICE | DECOMMISSIONED
  complianceStatus: string;
  diameterM: number;
  heightM: number;
  capacityM3: number;
  yearBuilt: number;
}

export interface DefectDto {
  defectCode: string;
  component: string;             // SHELL | FLOOR | ROOF | NOZZLE | FOUNDATION
  defectType: string;
  severity: string;              // class label e.g. "High", "Medium"
  status: string;                // OPEN | CLOSED | MONITOR
  maxLossPct: number;
  remainingLifeYr: number;
  firstDetectedDate: string;
}

export interface CorrosionAssessmentDto {
  id: number;

  assessmentDate: string;

  shellRemainingLifeYr: number;
  shellCorrRateMmYr: number;
  shellMinThicknessMm: number;
  shellRetirementMm: number;

  floorRemainingLifeYr: number;
  floorCorrRateMmYr: number;

  roofRemainingLifeYr: number;

  overallRemainingLifeYr: number;

  kFactor: number;

  nextInspectionDue: string;

  settlementMaxMm: number;

  coatingCondition: string;

  notes?: string;
}

export interface ThicknessHistoryDto {
  measurementYear: number;
  avgThicknessMm: number;
  minThicknessMm: number;
  shellCourse: number;
  source: string;
}

// Inspections / Planner
export interface InspectionCalendarDto {
  inspectionId: number;
  tankId: string;
  siteName: string;
  riskCategory: string;
  inspectionType: string;
  colorHex: string;
  weekNumber: number;
  plannedDate: string;
  actualDate: string | null;
  status: string;                // PLANNED | IN_PROGRESS | COMPLETED | CANCELLED
  inspectorName: string;
}

export interface CreateInspectionRequest {
  tankPk: number;
  inspectionTypeId: number;
  standardId: number;
  inspectorId: number;
  plannedDate?: string;
  weekNumber?: number;
  intervalYears?: number;
  intervalBasis?: string;
  notes?: string;
}

export interface UpdateInspectionStatusRequest {
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

// Heatmap
export interface HeatmapDto {
  defectCode: string;
  tankId: string;
  component: string;
  defectType: string;
  severity: string;
  classNum: number;
  plateId: string;
  radiusM: number;
  angleDeg: number;
  maxLossPct: number;
  wallLossMm: number;
  status: string;
}

// Reports
export interface ReportDto {
  id: number;
  tankId: string;
  template: string;
  standard: string;
  reportRef: string;
  inspectionDate: string;
  status: string;               // DRAFT | UNDER_REVIEW | SIGNED | PUBLISHED
  generatedAt: string;
}

export interface CreateReportRequest {
  tankId: string;              // ✔ matches backend
  templateId: number;          // Byte
  standardId: number;          // Short
  reportRef: string;
  inspectionDate: string;      // YYYY-MM-DD
  units?: string;

  sectionNames: string[];

  signatories?: {
    userId: number;
    role: string;
  }[];
}

export interface SignReportRequest {
  userId: number;
  role: 'AUTHOR' | 'REVIEWER' | 'APPROVER';
}

// Ingestion
export interface UploadIngestionRequest {
  tankPk: number;
  inspectionId?: number;
  technique: 'UT' | 'MFL' | 'VISUAL' | 'SETTLEMENT' | 'OTHER';
  sourceFilename: string;
  fileSha256?: string;
  uploadedBy: number;
  totalRows?: number;
}

export interface ColumnMappingDto {
  sourceColumn: string;
  timsField: string;
  required: boolean;
}

export interface IngestionJobDto {
  id: number;
  tankId: string;
  technique: string;
  sourceFilename: string;
  status: string;               // UPLOADED | MAPPING | VALIDATED | COMMITTED | FAILED
  totalRows: number;
  duplicateCount: number;
  outOfRangeCount: number;
  committedAt: string | null;
}

export interface DashboardActivityDto {
  id: number;
  icon: number;
  action: string;
  tank: string;
  user: string;
  time: string;
  detail: string;
}
export interface InspectionAlertDto {
  id: number;
  title?: string;
  message?: string;
  severity?: string;
  read?: boolean;
  createdAt?: string;
  acknowledgedAt?: string | null;

  tankId?: string;
  tank?: string;

  type?: string;
  category?: string;

  assignedTo?: string;

  detail?: string;
}
export interface SitePlanDto {
  tankId: string;
  x: number;
  y: number;
}
// Auth
export interface DevTokenRequest { email: string; }
export interface TokenResponse  { accessToken: string; tokenType: string; }

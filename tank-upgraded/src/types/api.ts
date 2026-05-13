/**
 * types/api.ts — Canonical TypeScript types for the TIMS API
 * FIXES APPLIED:
 *   - IngestionValidationResult: aligned to backend response shape (ING-002)
 *     backend returns {valid, warningCount, warningMessage, errors} not {status, checks}
 *   - CreateReportRequest: aligned to backend (templateId, standardId, reportRef, sectionNames, signatories)
 *   - Added CalculationBreakdown type (CALC-001..003)
 *   - Added BackendValidationResult for raw backend response normalisation
 */

// ── Generic pagination wrapper ────────────────────────────────────────────────
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // 0-based
  size: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface DevTokenRequest { email: string; }
export interface TokenResponse   { accessToken: string; tokenType: string; }

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardMetrics {
  totalTanks: number;
  highRiskTanks: number;
  inspectionsDue30Days: number;
  inspectionsDue30DaysBreakdown: string;
  highRiskReason?: string;
  compliancePercent: number;
  complianceBreakdown: string;
  openDefects?: number;
  overdueInspections?: number;
}

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

export interface SitePlanEntry {
  tankId: string;
  x: number;    // %
  y: number;    // %
}

export interface ActivityFeedItem {
  id: string;
  icon?: number;
  action: string;
  entityId?: string;
  tank?: string;
  tankId?: string;
  user?: string;
  userName?: string;
  time?: string;
  createdAt?: string;
  detail?: string;
  title?: string;
}

// ── Tank Detail ───────────────────────────────────────────────────────────────
export interface TankDetailDto {
  tankId: string;
  site: string;
  siteName?: string;
  service: string;
  riskCategory: string;
  status: string;                // IN_SERVICE | OUT_OF_SERVICE | DECOMMISSIONED
  operationalStatus?: string;
  complianceStatus: string;
  diameter: number;
  diameterM?: number;
  height: number;
  heightM?: number;
  capacity: number;
  capacityM3?: number;
  yearBuilt: number;
  foundation?: string;
  constructionCode?: string;

  // Compliance derived fields
  remainingLife?: number;
  corrosionRate?: number;
  minThickness?: number;
  retirementThickness?: number;
  activeDefects?: number;
  nextInspectionDue?: string;
  coatingCondition?: string;
  shellLife?: number;
  floorLife?: number;
  roofLife?: number;
  eemua159Status?: string;
}

// ── Defect ────────────────────────────────────────────────────────────────────
export interface DefectDto {
  id: string;
  defectCode?: string;
  tankId?: string;
  component: string;             // SHELL | FLOOR | ROOF | NOZZLE | FOUNDATION
  type: string;
  defectType?: string;
  severity: string;              // High | Medium | Low
  eemua159Class?: number;        // 1 | 2 | 3
  classNum?: number;
  status: string;                // OPEN | CLOSED | MONITOR
  maxLossPct: number;
  maxLoss?: number;
  wallLossMm?: number;
  remainingLifeYr?: number;
  firstDetectedDate?: string;
  firstDetected?: string;
  lastObserved?: string;
  location?: string;
  disposition?: string;
  growthRate?: number;
  nx?: number;
  ny?: number;
  radiusPx?: number;
  plateId?: string;
  radiusM?: number;
  angleDeg?: number;
}

// ── Defect shape used by D3FloorHeatmap component ─────────────────────────────
export interface Defect {
  id: string;
  tankId?: string;
  location: string;
  component: string;
  type: string;
  severity: string;
  eemua159Class: number;
  maxLossPct: number;
  wallLossMm: number;
  remainingThickness?: number;
  firstDetected?: string;
  lastObserved?: string;
  status: string;
  disposition?: string;
  growthRate?: number;
  growthSinceLastMm?: number;
  linkedDataset?: string;
  nx: number;
  ny: number;
  radiusPx?: number;
}

// ── Corrosion Assessment ──────────────────────────────────────────────────────
export interface CorrosionAssessmentDto {
  id: number;
  assessmentDate: string;
  computedAt?: string;
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
  maxCorrosionRate?: number;
  notes?: string;
}

// ── Calculation Breakdown (CALC-001/002/003) ──────────────────────────────────
export interface CalculationBreakdown {
  tankId: string;
  computedAt?: string;
  shellCorrRateMmYr?: number;
  localMaxCorrRateMmYr?: number;
  floorCorrRateMmYr?: number;
  overallRemainingLifeYr?: number;
  shellRemainingLifeYr?: number;
  floorRemainingLifeYr?: number;
  actionRequired?: boolean;
  overrideActive?: boolean;
  overrideRate?: number;
  overrideReason?: string;
  inputs?: Record<string, unknown>;
  steps?: Array<{ label: string; value: string | number; unit?: string }>;
}

// ── Thickness History ─────────────────────────────────────────────────────────
export interface ThicknessHistoryDto {
  year?: number;
  measurementYear?: number;
  thickness?: number;
  avgThicknessMm?: number;
  minThicknessMm?: number;
  shellCourse?: number;
  source?: string;
}

// ── Inspection / Calendar ─────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  inspectionId?: number;
  tankId: string;
  site?: string;
  siteName?: string;
  riskCategory?: string;
  risk?: string;
  inspectionType?: string;
  type?: string;
  colorHex?: string;
  color?: string;
  weekNumber?: number;
  week?: number;
  plannedDate?: string;
  actualDate?: string | null;
  status: string;
  inspectorName?: string;
  inspector?: string;
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
export interface HeatmapDataset {
  datasetId: string;
  label: string;
  date: string;
}

// ── Report ────────────────────────────────────────────────────────────────────
export interface ReportDto {
  id: string | number;
  tankId?: string;
  type?: string;
  template?: string;
  standard?: string;
  reportRef?: string;
  inspectionDate?: string;
  status: string;               // DRAFT | GENERATED | UNDER_REVIEW | SIGNED | APPROVED | PUBLISHED
  generatedAt?: string;
}

// FIX REP-001: aligned to backend CreateReportRequest contract
export interface CreateReportRequest {
  tankId: string;
  templateId: number;           // backend: Byte (1=WSE, 2=FFS, 3=ISE)
  standardId: number;           // backend: Short (1=EEMUA 159 Ed.6, 2=EEMUA 159 Ed.5)
  reportRef: string;
  sectionNames: string[];
  signatories: Array<{ userId: number; role: string }>;
}

// ── Ingestion ─────────────────────────────────────────────────────────────────
// FIX ING-002: Backend returns {valid, warningCount, warningMessage, errors}.
// The UI-facing type normalises these into a consistent shape with a derived 'status' field.
export interface IngestionValidationResult {
  // Backend fields
  valid: boolean;
  warningCount?: number;
  warningMessage?: string;
  errors?: string[];

  // Derived status — computed from valid + warningCount in normaliseValidation()
  status: 'OK' | 'WARNINGS' | 'ERRORS';

  // Legacy / extended UI fields (may be missing from backend; default to 0/[])
  totalRows: number;
  duplicates: number;
  outOfRange: number;
  checks: Array<{
    label: string;
    passed: boolean;
    warning?: boolean;
    detail?: string;
  }>;
  previewRows: Record<string, unknown>[];
}

/**
 * Normalise raw backend validation response into IngestionValidationResult.
 * Handles both old frontend-expected shape and real backend shape.
 */
export function normaliseValidation(raw: any): IngestionValidationResult {
  if (!raw) {
    return { valid: true, status: 'OK', totalRows: 0, duplicates: 0, outOfRange: 0, checks: [], previewRows: [] };
  }

  // Derive status
  let status: 'OK' | 'WARNINGS' | 'ERRORS';
  if (raw.status === 'ERRORS' || raw.valid === false || (raw.errors && raw.errors.length > 0)) {
    status = 'ERRORS';
  } else if (raw.status === 'WARNINGS' || (raw.warningCount && raw.warningCount > 0)) {
    status = 'WARNINGS';
  } else {
    status = 'OK';
  }

  // Build checks array from backend error/warning messages if the legacy checks array is missing
  const checks: IngestionValidationResult['checks'] = raw.checks ?? [];
  if (checks.length === 0) {
    if (raw.errors?.length) {
      raw.errors.forEach((err: string) => checks.push({ label: err, passed: false }));
    }
    if (raw.warningMessage) {
      checks.push({ label: raw.warningMessage, passed: true, warning: true });
    }
    if (checks.length === 0) {
      checks.push({ label: 'Validation passed', passed: true });
    }
  }

  return {
    valid: raw.valid ?? status !== 'ERRORS',
    warningCount: raw.warningCount ?? 0,
    warningMessage: raw.warningMessage,
    errors: raw.errors ?? [],
    status,
    totalRows: raw.totalRows ?? 0,
    duplicates: raw.duplicates ?? 0,
    outOfRange: raw.outOfRange ?? 0,
    checks,
    previewRows: raw.previewRows ?? [],
  };
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  userName: string;
  reason?: string;
  beforeState?: string;   // JSON snapshot string
  afterState?: string;    // JSON snapshot string
}

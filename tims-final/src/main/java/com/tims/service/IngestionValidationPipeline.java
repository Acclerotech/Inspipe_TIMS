package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.entity.*;
import com.tims.exception.BusinessException;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class IngestionValidationPipeline {

    private static final String REQUIRED_UNIT = "mm";

    // Engineering validation thresholds
    private static final double HARD_FAIL_MEAN_MM = 3.0;
    private static final double WARNING_MEAN_MM = 6.0;
    private static final double MIN_RATIO = 0.10;

    private final IngestionColumnMappingRepository mappingRepository;
    private final UtReadingRepository utReadingRepository;           // For post-commit defect creation
    private final StagingUtReadingRepository stagingUtReadingRepository; // ADDED: For pre-commit validation
    private final DefectRepository defectRepository;
    private final DefectClassRepository defectClassRepository;
    private final AuditService auditService;

    // ─────────────────────────────────────────────
    // MAIN VALIDATION ENTRY
    // ─────────────────────────────────────────────
    public ValidationResult validate(IngestionJob job) {

        log.info("[VALIDATION][JOB:{}] started", job.getId());

        ValidationResult result = new ValidationResult();

        // ============================================================
        // STEP 1 — COLUMN UNIT VALIDATION
        // ============================================================
        List<IngestionColumnMapping> mappings = mappingRepository.findByJobId(job.getId());

        for (IngestionColumnMapping mapping : mappings) {
            if (!isThicknessField(mapping.getTimsField())) {
                continue;
            }

            String unit = extractUnit(mapping.getSourceColumn());

            // Only block if we explicitly detect a non-mm unit (like inches)
            if (unit != null && !REQUIRED_UNIT.equalsIgnoreCase(unit)) {
                result.blocked = true;
                result.blockReason = "Commit blocked. Column '" + mapping.getSourceColumn() +
                        "' appears to use '" + unit + "' while TIMS requires mm. Check column-unit settings.";

                log.warn("[VALIDATION][JOB:{}] column unit mismatch detected column={}", job.getId(), mapping.getSourceColumn());

                result.deriveStatus();
                return result;
            }
        }

        // ============================================================
        // STEP 2 — LOAD READINGS (FROM STAGING TABLE)
        // ============================================================
        List<StagingUtReading> readings = stagingUtReadingRepository.findByJobId(job.getId());

        if (readings.isEmpty()) {
            result.blocked = true;
            result.blockReason = "No UT readings available for validation in staging";
            log.warn("[VALIDATION][JOB:{}] no readings found in staging", job.getId());
            result.deriveStatus();
            return result;
        }

        // ============================================================
        // STEP 3 — INVALID VALUE CHECKS
        // ============================================================
        long invalidThicknessCount = readings.stream()
                .filter(r -> r.getThicknessMm() == null || r.getThicknessMm().doubleValue() <= 0)
                .count();

        if (invalidThicknessCount > 0) {
            result.blocked = true;
            result.blockReason = invalidThicknessCount + " readings contain invalid or missing thickness values";
            log.warn("[VALIDATION][JOB:{}] invalid thickness count={}", job.getId(), invalidThicknessCount);
            result.deriveStatus();
            return result;
        }

        // ============================================================
        // STEP 4 — MEAN THICKNESS VALIDATION
        // ============================================================
        double meanThickness = readings.stream()
                .filter(r -> r.getThicknessMm() != null)
                .mapToDouble(r -> r.getThicknessMm().doubleValue())
                .average()
                .orElse(0);

        log.info("[VALIDATION][JOB:{}] staging mean thickness={}", job.getId(), meanThickness);

        // HARD FAIL
        if (meanThickness > 0 && meanThickness < HARD_FAIL_MEAN_MM) {
            result.blocked = true;
            result.blockReason = "Commit blocked. Mean thickness " + String.format("%.3f", meanThickness) +
                    " mm appears unrealistically low. Possible inches uploaded as mm. Check column-unit settings.";

            log.warn("[VALIDATION][JOB:{}] possible inch/mm mismatch mean={}", job.getId(), meanThickness);
            result.deriveStatus();
            return result;
        }

        // WARNING RANGE
        if (meanThickness >= HARD_FAIL_MEAN_MM && meanThickness < WARNING_MEAN_MM) {
            appendWarning(result, "Mean thickness " + String.format("%.2f", meanThickness) + " mm is unusually low — verify units");
        }

        // ============================================================
        // STEP 5 — RATIO VALIDATION
        // ============================================================
        long suspiciousRatioCount = readings.stream()
                .filter(r -> r.getThicknessMm() != null &&
                        r.getNominalMm() != null &&
                        r.getNominalMm().doubleValue() > 0 &&
                        (r.getThicknessMm().doubleValue() / r.getNominalMm().doubleValue()) < MIN_RATIO)
                .count();

        if (suspiciousRatioCount > 0) {
            result.blocked = true;
            result.blockReason = suspiciousRatioCount + " readings appear to use inches instead of mm. " +
                    "Thickness/nominal ratio is unrealistically low. Check column-unit settings.";

            log.warn("[VALIDATION][JOB:{}] suspicious ratio count={}", job.getId(), suspiciousRatioCount);
            result.deriveStatus();
            return result;
        }

        // ============================================================
        // STEP 6 — RETIREMENT THRESHOLD WARNING
        // ============================================================
        List<StagingUtReading> belowRetirement = readings.stream()
                .filter(StagingUtReading::isBelowRetirement)
                .toList();

        if (!belowRetirement.isEmpty()) {
            appendWarning(result, belowRetirement.size() + " readings below retirement thickness");
            log.warn("[VALIDATION][JOB:{}] below retirement count={}", job.getId(), belowRetirement.size());
        }

        // ============================================================
        // STEP 7 — DUPLICATE CHECK
        // ============================================================
        // Note: Ensure `countDuplicateReadingsByJobId` exists in your StagingUtReadingRepository
        result.duplicateCount = (int) stagingUtReadingRepository.countDuplicateReadingsByJobId(job.getId());

        if (result.duplicateCount > 0) {
            appendWarning(result, result.duplicateCount + " duplicate readings detected in staging");
        }

        // ============================================================
        // STEP 8 — FINALIZE
        // ============================================================
        result.outOfRangeCount = belowRetirement.size();
        result.deriveStatus();

        log.info("[VALIDATION][JOB:{}] completed valid={} blocked={} warnings={}",
                job.getId(), result.valid, result.blocked, result.warningCount);

        return result;
    }

    // ─────────────────────────────────────────────
    // CREATE DEFECTS FOR RETIREMENT BREACHES
    // ─────────────────────────────────────────────
    // Note: This method remains mapped to the Production UtReading table,
    // because it is called in IngestionJobService AFTER the commit moves staging data to production.
    public int createThresholdBreachDefects(IngestionJob job, Tank tank) {

        List<UtReading> below = utReadingRepository.findByJobIdAndBelowRetirementTrue(job.getId());

        if (below.isEmpty()) {
            return 0;
        }

        var defectClass = defectClassRepository.findByClassNum((byte) 1)
                .orElseThrow(() -> new BusinessException("DefectClass 1 not seeded"));

        int created = 0;

        for (UtReading reading : below) {

            String defectCode = "UT-BREACH-" + tank.getTankId() + "-" + reading.getReadingId();

            if (defectRepository.existsByDefectCode(defectCode)) {
                continue;
            }

            Defect defect = Defect.builder()
                    .tank(tank)
                    .defectCode(defectCode)
                    .component(reading.getShellCourse() != null ? Defect.Component.SHELL : Defect.Component.FLOOR)
                    .defectType("RETIREMENT_BREACH")
                    .defectClass(defectClass)
                    .wallLossMm(reading.getNominalMm() != null ? reading.getNominalMm().subtract(reading.getThicknessMm()) : null)
                    .nominalMm(reading.getNominalMm())
                    .firstDetectedDate(LocalDate.now())
                    .status(Defect.Status.OPEN)
                    .disposition("IMMEDIATE_ACTION")
                    .linkedJob(job)
                    .locationDescription("Shell course " + reading.getShellCourse() + " @ " + reading.getAngleDeg() + " deg")
                    .build();

            Defect saved = defectRepository.save(defect);

            auditService.record(
                    "Defect",
                    saved.getId().toString(),
                    AuditEvent.Action.CREATE,
                    null,
                    saved
            );

            created++;
        }

        log.info("[DEFECTS][JOB:{}] created threshold breach defects={}", job.getId(), created);
        return created;
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────
    private boolean isThicknessField(String timsField) {
        if (timsField == null) return false;
        String lower = timsField.toLowerCase();
        return lower.contains("thickness") || lower.contains("wall_loss") || lower.contains("_mm");
    }

    private String extractUnit(String columnName) {
        if (columnName == null) return null;
        String lower = columnName.toLowerCase();

        if (lower.contains("_in") || lower.contains("inch") || lower.contains("inches")) {
            return "in";
        }
        return null;
    }

    private void appendWarning(ValidationResult result, String warning) {
        result.warningCount++;
        if (result.warningMessage == null) {
            result.warningMessage = warning;
        } else {
            result.warningMessage = result.warningMessage + "; " + warning;
        }
    }

    // ─────────────────────────────────────────────
    // VALIDATION RESULT
    // ─────────────────────────────────────────────
    public static class ValidationResult {

        public boolean valid = true;
        public boolean blocked = false;
        public String blockReason;
        public int warningCount = 0;
        public String warningMessage;
        public int duplicateCount = 0;
        public int outOfRangeCount = 0;
        public IngestionJob.Status status;

        public void deriveStatus() {
            if (blocked) {
                this.valid = false;
                this.status = IngestionJob.Status.FAILED;
                return;
            }
            this.valid = true;
            this.status = IngestionJob.Status.VALIDATED;
        }
    }
}
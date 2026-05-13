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

    private final IngestionColumnMappingRepository mappingRepository;
    private final UtReadingRepository utReadingRepository;
    private final DefectRepository defectRepository;
    private final DefectClassRepository defectClassRepository;
    private final AuditService auditService;

    public ValidationResult validate(IngestionJob job) {
        log.info("Validating ingestion job {}", job.getId());

        var result = new ValidationResult();

        List<IngestionColumnMapping> mappings =
                mappingRepository.findByJobId(job.getId());

        // ─────────────────────────────────────────────
        // COLUMN-NAME UNIT VALIDATION
        // ─────────────────────────────────────────────
        for (IngestionColumnMapping m : mappings) {

            if (isThicknessField(m.getTimsField())) {

                String unit = extractUnit(m.getSourceColumn());

                if (unit != null && !REQUIRED_UNIT.equalsIgnoreCase(unit)) {

                    result.blocked = true;

                    result.blockReason =
                            "Unit mismatch: column '" + m.getSourceColumn()
                                    + "' appears to use '" + unit
                                    + "'. TIMS requires all thickness values in mm. "
                                    + "Please correct the column-unit setting and re-upload.";

                    log.warn(
                            "AT-023 BLOCK: job {} unit mismatch: {} = {}",
                            job.getId(),
                            m.getSourceColumn(),
                            unit
                    );

                    result.deriveStatus();
                    return result;
                }
            }
        }

        // Load readings once
        List<UtReading> readings =
                utReadingRepository.findByJobId(job.getId());

        // ─────────────────────────────────────────────
        // ING-003: VALUE-BASED UNIT VALIDATION
        // ─────────────────────────────────────────────
        double meanThickness = readings.stream()
                .filter(r -> r.getThicknessMm() != null)
                .mapToDouble(r -> r.getThicknessMm().doubleValue())
                .average()
                .orElse(0);

        if (meanThickness > 0 && meanThickness < 3.0) {

            throw new BusinessException(
                    "Unit validation failed: mean thickness reading "
                            + String.format("%.3f", meanThickness)
                            + " appears to be in inches, not mm. "
                            + "Please convert to mm before upload."
            );
        }

        if (meanThickness >= 3.0 && meanThickness < 6.0) {

            result.warningCount++;

            String warning =
                    "Mean thickness "
                            + String.format("%.2f", meanThickness)
                            + "mm is unusually low — verify units are mm";

            result.warningMessage =
                    result.warningMessage != null
                            ? result.warningMessage + "; " + warning
                            : warning;
        }

        // ─────────────────────────────────────────────
        // RETIREMENT THICKNESS VALIDATION
        // ─────────────────────────────────────────────
        List<UtReading> belowRetirement =
                utReadingRepository.findByJobIdAndBelowRetirementTrue(job.getId());

        if (!belowRetirement.isEmpty()) {

            result.warningCount += belowRetirement.size();

            String retirementWarning =
                    belowRetirement.size()
                            + " reading(s) are below retirement thickness. "
                            + "Dataset will be committed with a WARNING badge. "
                            + "Defects will be created automatically.";

            result.warningMessage =
                    result.warningMessage != null
                            ? result.warningMessage + "; " + retirementWarning
                            : retirementWarning;

            log.warn(
                    "AT-022 WARNING: job {} has {} readings below retirement",
                    job.getId(),
                    belowRetirement.size()
            );
        }

        result.valid = true;

        result.duplicateCount =
                (int) utReadingRepository.countDuplicateReadingsByJobId(job.getId());

        result.outOfRangeCount = belowRetirement.size();

        // REQUIRED PATCH
        result.deriveStatus();

        log.info(
                "Validation complete for job {}: blocked={} warnings={}",
                job.getId(),
                result.blocked,
                result.warningCount
        );

        return result;
    }

    public int createThresholdBreachDefects(IngestionJob job, Tank tank) {

        List<UtReading> below =
                utReadingRepository.findByJobIdAndBelowRetirementTrue(job.getId());

        if (below.isEmpty()) {
            return 0;
        }

        var class1 = defectClassRepository.findByClassNum((byte) 1)
                .orElseThrow(() ->
                        new BusinessException("DefectClass 1 not seeded"));

        int created = 0;

        for (UtReading r : below) {

            String code =
                    "UT-BREACH-" + tank.getTankId() + "-" + r.getReadingId();

            if (defectRepository.existsByDefectCode(code)) {
                continue;
            }

            var defect = Defect.builder()
                    .tank(tank)
                    .defectCode(code)
                    .component(
                            r.getShellCourse() != null
                                    ? Defect.Component.SHELL
                                    : Defect.Component.FLOOR
                    )
                    .defectType("RETIREMENT_BREACH")
                    .defectClass(class1)
                    .wallLossMm(
                            r.getNominalMm() != null
                                    ? r.getNominalMm().subtract(r.getThicknessMm())
                                    : null
                    )
                    .nominalMm(r.getNominalMm())
                    .firstDetectedDate(LocalDate.now())
                    .status(Defect.Status.OPEN)
                    .disposition("IMMEDIATE_ACTION")
                    .linkedJob(job)
                    .locationDescription(
                            "Shell course "
                                    + r.getShellCourse()
                                    + " @ "
                                    + r.getAngleDeg()
                                    + " deg -- BELOW RETIREMENT"
                    )
                    .build();

            var saved = defectRepository.save(defect);

            auditService.record(
                    "Defect",
                    saved.getId().toString(),
                    AuditEvent.Action.CREATE,
                    null,
                    saved
            );

            created++;
        }

        log.info(
                "Created {} retirement-breach defects for job {}",
                created,
                job.getId()
        );

        return created;
    }

    private boolean isThicknessField(String timsField) {

        if (timsField == null) {
            return false;
        }

        String lower = timsField.toLowerCase();

        return lower.contains("thickness")
                || lower.contains("wall_loss")
                || lower.contains("_mm");
    }

    private String extractUnit(String columnName) {

        if (columnName == null) {
            return null;
        }

        String lower = columnName.toLowerCase();

        if (lower.endsWith("_in")
                || lower.contains("inch")
                || lower.contains("_inches")) {

            return "in";
        }

        return null;
    }

    public static class ValidationResult {

        public boolean valid = true;

        public boolean blocked = false;

        public String blockReason = null;

        public int warningCount = 0;

        public String warningMessage = null;

        public int duplicateCount = 0;

        public int outOfRangeCount = 0;

        // REQUIRED FOR API RESPONSE
        public String status;

        public void deriveStatus() {

            if (blocked) {
                this.status = "BLOCKED";
                return;
            }

            if (warningCount > 0) {
                this.status = "WARNING";
                return;
            }

            this.status = "VALID";
        }
    }
}
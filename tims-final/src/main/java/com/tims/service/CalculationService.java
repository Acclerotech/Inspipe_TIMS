package com.tims.service;



import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.dto.request.CorrosionCalculationRequest;
import com.tims.dto.request.OverrideRequest;
import com.tims.dto.request.RemainingLifeRequest;
import com.tims.dto.response.CalculationBreakdownResponse;
import com.tims.dto.response.CalculationResponse;
import com.tims.entity.CorrosionAssessment;
import com.tims.entity.CorrosionOverride;
import com.tims.entity.InspectionAlert;
import com.tims.entity.Tank;
import com.tims.exception.BusinessException;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CalculationService {

    private static final MathContext MC = new MathContext(6, RoundingMode.HALF_UP);
    private static final String CALC_VERSION = "TIMS-CALC-v1.0";

    private final CorrosionAssessmentRepository assessmentRepository;
    private final CorrosionOverrideRepository   overrideRepository;
    private final TankRepository                tankRepository;
    private final UserRepository                userRepository;
    private final AuditService                  auditService;
    private final InspectionAlertRepository alertRepository;
    private final UtReadingRepository     utReadingRepository;


    @Transactional(readOnly = true)
    public CalculationResponse getById(Integer id) {
        var ca = assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CorrosionAssessment", id));
        return toResponse(ca);
    }

    @Transactional(readOnly = true)
    public List<CalculationResponse> getHistory(Short tankId) {
        if (!tankRepository.existsById(tankId)) throw new ResourceNotFoundException("Tank", tankId);
        return assessmentRepository.findByTankIdOrderByAssessmentDateDesc(tankId)
                .stream().map(this::toResponse).toList();
    }

    /**
     * Validate a calculation — checks retirement threshold and returns status.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> validateCalculation(Integer assessmentId) {
        var ca = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("CorrosionAssessment", assessmentId));

        boolean valid = ca.getShellCorrRateMmYr() != null && ca.getShellRemainingLifeYr() != null;
        boolean belowRetirement = valid && ca.getShellRemainingLifeYr().doubleValue() <= 0;

        return Map.of(
                "assessmentId",    assessmentId,
                "calcVersion",     CALC_VERSION,
                "valid",           valid,
                "belowRetirement", belowRetirement,
                "remainingLifeYr", ca.getOverallRemainingLifeYr() != null ? ca.getOverallRemainingLifeYr() : BigDecimal.ZERO,
                "corrRateMmYr",    ca.getShellCorrRateMmYr() != null ? ca.getShellCorrRateMmYr() : BigDecimal.ZERO
        );
    }

    /**
     * Compute mean corrosion rate from two thickness measurements.
     */
    public Map<String, Object> computeCorrosion(CorrosionCalculationRequest req) {
        if (req.getYearsElapsed() == null || req.getYearsElapsed().doubleValue() <= 0)
            throw new BusinessException("yearsElapsed must be > 0");

        BigDecimal loss = req.getPrevMeanThicknessMm().subtract(req.getCurrMeanThicknessMm());
        BigDecimal rate = loss.divide(req.getYearsElapsed(), MC);

        return Map.of(
                "tankId",           req.getTankId(),
                "corrRateMmYr",     rate.setScale(4, RoundingMode.HALF_UP),
                "thicknessLossMm",  loss.setScale(3, RoundingMode.HALF_UP),
                "yearsElapsed",     req.getYearsElapsed(),
                "calcVersion",      CALC_VERSION
        );
    }

    /**
     * Compute remaining life from current min thickness, retirement threshold, and rate.
     */
    public Map<String, Object> computeRemainingLife(RemainingLifeRequest req) {
        if (req.getCorrRateMmYr().doubleValue() <= 0)
            throw new BusinessException("corrRateMmYr must be > 0");

        BigDecimal remainingLife = req.getCurrentMinThicknessMm()
                .subtract(req.getRetirementMm())
                .divide(req.getCorrRateMmYr(), MC);

        return Map.of(
                "tankId",            req.getTankId(),
                "remainingLifeYr",   remainingLife.setScale(2, RoundingMode.HALF_UP),
                "currentMinMm",      req.getCurrentMinThicknessMm(),
                "retirementMm",      req.getRetirementMm(),
                "corrRateMmYr",      req.getCorrRateMmYr(),
                "actionRequired",    remainingLife.doubleValue() <= 0
        );
    }

    /**
     * Recompute an existing assessment with the latest override if active.
     */
    public CalculationResponse recompute(Integer assessmentId) {
        var ca = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new ResourceNotFoundException("CorrosionAssessment", assessmentId));
        var before = toResponse(ca);

        var overrideOpt = overrideRepository.findActiveByTankId(ca.getTank().getId());
        if (overrideOpt.isPresent()) {
            var ov = overrideOpt.get();
            log.info("Applying override for tank {} in recompute", ca.getTank().getId());

            if (ca.getShellRemainingLifeYr() != null && ca.getShellCorrRateMmYr() != null
                    && ca.getShellCorrRateMmYr().doubleValue() > 0) {
                BigDecimal newRate = ov.getOverrideAllowanceMm()
                        .divide(BigDecimal.valueOf(
                                ca.getShellRemainingLifeYr().doubleValue() > 0
                                        ? ca.getShellRemainingLifeYr().doubleValue() : 1.0), MC);
                ca.setShellCorrRateMmYr(newRate);

                if (ca.getShellMinThicknessMm() != null && ca.getShellRetirementMm() != null) {
                    BigDecimal newLife = ca.getShellMinThicknessMm()
                            .subtract(ca.getShellRetirementMm())
                            .divide(newRate.max(BigDecimal.valueOf(0.001)), MC);
                    ca.setShellRemainingLifeYr(newLife);
                    ca.setOverallRemainingLifeYr(newLife);
                }
            }
        }

        var saved = assessmentRepository.save(ca);
        auditService.record("CorrosionAssessment", saved.getId().toString(),
                AuditEvent.Action.UPDATE, before, toResponse(saved));

        return toResponse(saved);
    }

    /**
     * Apply a corrosion allowance override for a tank.
     */
    public CorrosionOverride applyOverride(OverrideRequest req) {
        var tank = tankRepository.findById(req.getTankId())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", req.getTankId()));

        var email = SecurityContextHolder.getContext().getAuthentication().getName();
        var user  = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User: " + email));

        // Deactivate current override
        overrideRepository.findActiveByTankId(tank.getId()).ifPresent(o -> {
            o.setActive(false); overrideRepository.save(o);
        });

        var override = CorrosionOverride.builder()
                .tank(tank)
                .defaultAllowanceMm(BigDecimal.valueOf(6.0))  // system default
                .overrideAllowanceMm(req.getOverrideAllowanceMm())
                .reason(req.getReason())
                .overriddenBy(user)
                .active(true)
                .build();

        var saved = overrideRepository.save(override);
        auditService.record("CorrosionOverride", saved.getId().toString(),
                AuditEvent.Action.OVERRIDE, null, saved, req.getReason());

        return saved;
    }

    private CalculationResponse toResponse(CorrosionAssessment ca) {
        return CalculationResponse.builder()
                .id(ca.getId()).tankId(ca.getTank().getTankId())
                .assessmentDate(ca.getAssessmentDate())
                .standardCode(ca.getStandard() != null ? ca.getStandard().getCode() : null)
                .assessedByName(ca.getAssessedBy() != null ? ca.getAssessedBy().getFullName() : null)
                .shellCorrRateMmYr(ca.getShellCorrRateMmYr())
                .shellMinThicknessMm(ca.getShellMinThicknessMm())
                .shellRetirementMm(ca.getShellRetirementMm())
                .shellRemainingLifeYr(ca.getShellRemainingLifeYr())
                .overallRemainingLifeYr(ca.getOverallRemainingLifeYr())
                .kFactor(ca.getKFactor())
                .nextInspectionDue(ca.getNextInspectionDue())
                .coatingCondition(ca.getCoatingCondition() != null ? ca.getCoatingCondition().name() : null)
                .notes(ca.getNotes()).createdAt(ca.getCreatedAt())
                .build();
    }
    @Transactional
    public void recomputeForTank(Tank tank) {
        log.info("CALC: Recomputing for tank {}", tank.getTankId());

        var assessmentOpt = assessmentRepository.findLatestByTankId(tank.getId());
        if (assessmentOpt.isEmpty()) {
            log.info("CALC: No existing assessment for tank {} — skipping auto-recompute", tank.getTankId());
            return;
        }

        var ca = assessmentOpt.get();

        // ── local max corrosion rate from UT readings ─────────────
        BigDecimal localMaxRate = computeLocalMaxCorrosionRate(tank.getId());
        if (localMaxRate != null) {
            ca.setShellCorrRateMmYr(localMaxRate);
            log.debug("CALC: Local max corrosion rate={} for tank {}", localMaxRate, tank.getTankId());
        }

        // ── remaining life ────────────────────────────────────────
        if (ca.getShellCorrRateMmYr() != null && ca.getShellCorrRateMmYr().doubleValue() > 0
                && ca.getShellMinThicknessMm() != null && ca.getShellRemainingLifeYr() != null) {

            BigDecimal remainingLife = ca.getShellMinThicknessMm()
                    .subtract(ca.getShellRetirementMm())
                    .divide(ca.getShellCorrRateMmYr(), MC);

            ca.setShellRemainingLifeYr(remainingLife);
            ca.setOverallRemainingLifeYr(remainingLife);

            // ── CALC-002: ACTION_REQUIRED ─────────────────────────
            if (remainingLife.doubleValue() <= 0) {
                tank.setComplianceStatus(com.tims.entity.Tank.ComplianceStatus.ACTION_REQUIRED);
                tankRepository.save(tank);
                log.warn("CALC-002: Tank {} has remainingLife={} — set ACTION_REQUIRED",
                        tank.getTankId(), remainingLife);

                createActionRequiredAlert(tank, remainingLife);
            }
        }

        ca.setAssessmentDate(java.time.LocalDate.now());
        assessmentRepository.save(ca);

        auditService.record("CorrosionAssessment", ca.getId().toString(),
                AuditEvent.Action.MODIFY, null,
                Map.of("tankId", tank.getTankId(), "remainingLife",
                        ca.getShellRemainingLifeYr() != null ? ca.getShellRemainingLifeYr() : "N/A",
                        "trigger", "AUTO_COMMIT"));
    }

    /**
     * Computes the local maximum corrosion rate from UT readings for a tank.
     * Uses the difference between nominal thickness and current min reading
     * divided by time elapsed (approximated from measuredAt vs oldest reading).
     *
     * Returns null if insufficient data.
     */
    private BigDecimal computeLocalMaxCorrosionRate(Short tankId) {
        List<com.tims.entity.UtReading> readings =
                utReadingRepository.findByTankIdOrderByMeasuredAtAsc(tankId);

        if (readings.size() < 2) return null;

        // Find worst (minimum) current reading
        var worstCurrent = readings.stream()
                .max(Comparator.comparingLong(r -> r.getMeasuredAt().toEpochSecond(
                        java.time.ZoneOffset.UTC))) // latest time
                .flatMap(latest -> readings.stream()
                        .filter(r -> r.getMeasuredAt().equals(latest.getMeasuredAt()))
                        .min(Comparator.comparing(com.tims.entity.UtReading::getThicknessMm)));

        var oldest = readings.stream()
                .min(Comparator.comparing(com.tims.entity.UtReading::getMeasuredAt));

        if (worstCurrent.isEmpty() || oldest.isEmpty()) return null;

        var curr = worstCurrent.get();
        var prev = oldest.get();

        if (curr.getNominalMm() == null && prev.getThicknessMm() == null) return null;

        BigDecimal prevThickness = (prev.getNominalMm() != null) ? prev.getNominalMm() : prev.getThicknessMm();
        BigDecimal loss = prevThickness.subtract(curr.getThicknessMm());

        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(
                prev.getMeasuredAt().toLocalDate(), curr.getMeasuredAt().toLocalDate());
        if (daysBetween <= 0) return null;

        BigDecimal yearsElapsed = BigDecimal.valueOf(daysBetween)
                .divide(BigDecimal.valueOf(365.25), MC);

        if (yearsElapsed.doubleValue() <= 0 || loss.doubleValue() <= 0) return null;

        return loss.divide(yearsElapsed, MC).abs();
    }

    private void createActionRequiredAlert(Tank tank, BigDecimal remainingLife) {
        try {
            // Assign to first admin user or user id=1 as fallback
            var assignee = userRepository.findAll().stream().findFirst().orElse(null);
            if (assignee == null) return;

            var alert = InspectionAlert.builder()
                    .tank(tank)
                    .alertType(InspectionAlert.AlertType.ACTION_REQUIRED)
                    .message(String.format(
                            "Tank %s requires action — remaining life: %.2f yr",
                            tank.getTankId(), remainingLife.doubleValue()))
                    .assignedTo(assignee)
                    .build();
            alertRepository.save(alert);
            log.info("CALC-002: Alert created for tank {}", tank.getTankId());
        } catch (Exception e) {
            log.error("Failed to create ACTION_REQUIRED alert: {}", e.getMessage());
        }
    }


// ── (2) getBreakdown — CALC-003 ──────────────────────────────

    /**
     * Returns a full calculation breakdown for a tank, including
     * mean + local max corrosion rates, remaining life, override info,
     * and inspection interval recommendation.
     */
    @Transactional(readOnly = true)
    public com.tims.dto.response.CalculationBreakdownResponse getBreakdown(String tankId) {
        var tank = tankRepository.findByTankId(tankId)
                .orElseThrow(() -> new com.tims.exception.ResourceNotFoundException("Tank", tankId));

        var assessmentOpt = assessmentRepository.findLatestByTankId(tank.getId());
        if (assessmentOpt.isEmpty()) {
            throw new com.tims.exception.ResourceNotFoundException("CorrosionAssessment for tank", tankId);
        }
        var ca = assessmentOpt.get();

        // Active override (if any)
        var overrideOpt = overrideRepository.findActiveByTankId(tank.getId());

        BigDecimal localMaxRate = computeLocalMaxCorrosionRate(tank.getId());

        boolean actionRequired = ca.getShellRemainingLifeYr() != null
                && ca.getShellRemainingLifeYr().doubleValue() <= 0;

        String recommendation = buildInspectionRecommendation(ca, actionRequired);

        return CalculationBreakdownResponse.builder()
                .tankId(tank.getId())
                .tankRef(tank.getTankId())
                .meanCorrRateMmYr(ca.getShellCorrRateMmYr())
                .localMaxCorrRateMmYr(localMaxRate)
                .shellMinThicknessMm(ca.getShellMinThicknessMm())
                .remainingLifeYr(ca.getShellRemainingLifeYr())
                .actionRequired(actionRequired)
                .overrideAllowanceMm(overrideOpt.map(com.tims.entity.CorrosionOverride::getOverrideAllowanceMm).orElse(null))
                .overrideReason(overrideOpt.map(com.tims.entity.CorrosionOverride::getReason).orElse(null))
                .overriddenBy(overrideOpt.map(o -> o.getOverriddenBy() != null ? o.getOverriddenBy().getEmail() : null).orElse(null))
                .inspectionIntervalRecommendation(recommendation)
                .calcVersion(CALC_VERSION)
                .assessmentDate(ca.getAssessmentDate())
                .build();
    }

    /**
     * Simple EEMUA-aligned inspection interval recommendation.
     */
    private String buildInspectionRecommendation(
            com.tims.entity.CorrosionAssessment ca, boolean actionRequired) {
        if (actionRequired)
            return "IMMEDIATE ACTION REQUIRED — schedule inspection within 30 days";
        if (ca.getShellRemainingLifeYr() == null)
            return "Insufficient data — schedule baseline inspection";
        double life = ca.getShellRemainingLifeYr().doubleValue();
        if (life <= 2)  return "HIGH urgency — inspect within 6 months";
        if (life <= 5)  return "MEDIUM urgency — inspect within 12 months";
        return "LOW urgency — next scheduled inspection sufficient";
    }

}
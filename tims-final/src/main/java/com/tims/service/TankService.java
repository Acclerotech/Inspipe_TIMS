package com.tims.service;
import com.tims.audit.AuditEvent;
import com.tims.audit.AuditEventRepository;
import com.tims.dto.request.ReopenInspectionRequest;
import com.tims.dto.response.*;
import com.tims.entity.CorrosionAssessment;
import com.tims.entity.Tank;
import com.tims.exception.BusinessException;
import com.tims.exception.ResourceNotFoundException;
import com.tims.mapper.CorrosionMapper;
import com.tims.mapper.DefectMapper;
import com.tims.mapper.InspectionMapper;
import com.tims.mapper.TankMapper;
import com.tims.report.ComplianceZipService;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.crossstore.ChangeSetPersister;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TankService {

    private final TankRepository tankRepository;
    private final DefectRepository defectRepository;
    private final CorrosionAssessmentRepository corrosionRepo;
    private final ThicknessHistoryRepository thicknessRepo;
    private final InspectionRepository inspectionRepository;
    private final TankMapper tankMapper;
    private final DefectMapper defectMapper;
    private final CorrosionMapper corrosionMapper;
    private final InspectionMapper inspectionMapper;
    private final AuditEventRepository auditEventRepository;
    private final DocumentRepository documentRepository;
    private final InspectionService inspectionService;
    private final ComplianceReportRepository complianceReportRepository;
    private final ComplianceZipService complianceZipService;
    private final IngestionJobRepository ingestionJobRepository;
    private final CorrosionAssessmentRepository corrosionAssessmentRepository;
    private final ActivityFeedRepository activityFeedRepository; //
    private final ThicknessHistoryRepository thicknessHistoryRepository;
    // <-- Add this if not present
    public TankResponse getTank(String tankId) {
        log.debug("Fetching tank {}", tankId);
        Tank t = tankRepository.findByTankId(tankId)
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));
        CorrosionAssessment ca =
                corrosionAssessmentRepository
                        .findByTankId(t.getId()).orElseThrow(() ->
                                new ResourceNotFoundException("Corrosion assessment not found for tank " + tankId)
                        )
                        ;

        return new TankResponse(
                t.getId(),
                t.getTankId(),
                t.getSite() != null ? t.getSite().getName() : null,
                t.getSite() != null ? t.getSite().getCountry() : null,
                t.getProductService() != null ? t.getProductService().getName() : null,
                t.getRiskCategory() != null ? t.getRiskCategory().getCode() : null,
                t.getRiskCategory() != null ? t.getRiskCategory().getColorHex() : null,
                t.getConstructionCode(),
                t.getDiameterM(),
                t.getHeightM(),
                t.getCapacityM3(),
                t.getYearBuilt(),
                t.getFoundationType(),
                t.getCriticalityTier(),
                String.valueOf(t.getOperationalStatus()),
                String.valueOf(t.getComplianceStatus()),
                t.getLastUpdatedAt(),
                t.getCreatedAt(),
                ca != null ? ca.getShellRemainingLifeYr() : null,
                ca != null ? ca.getFloorRemainingLifeYr() : null,
                ca != null ? ca.getRoofRemainingLifeYr() : null,

                ca != null ? ca.getKFactor(): null,
                ca != null ? ca.getShellMinThicknessMm() : null,

                ca != null ? ca.getNextInspectionDue() : null,

                ca != null ? ca.getCoatingCondition().name() : null,

                null // active defects optional for now

        );
    }

    public Page<DefectResponse> getDefects(String tankId, Pageable pageable) {

        log.debug("Fetching defects for tank {}", tankId);

        if (tankId == null || tankId.trim().isEmpty()) {
            throw new IllegalArgumentException("tankId must not be null or empty");
        }

        var tank = tankRepository.findByTankId(tankId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        return defectRepository
                .findByTankId(tank.getId(), pageable)
                .map(defectMapper::toResponse);
    }

    public CorrosionAssessmentResponse getLatestCorrosionAssessment(String tankId) {


            log.debug("Fetching corrosion for tank {}", tankId);

            // 1. String edge-case handling
            if (tankId == null || tankId.trim().isEmpty()) {
                throw new IllegalArgumentException("tankId must not be null or empty");
            }

            // 2. Fetch tank safely by business key
            var tank = tankRepository.findByTankId(tankId.trim())
                    .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

            // 3. Fetch latest corrosion assessment
            var assessment = corrosionRepo.findLatestByTankId(tank.getId())
                    .orElseThrow(() ->
                            new ResourceNotFoundException("No corrosion assessment found for tank " + tankId)
                    );

            return corrosionMapper.toResponse(assessment);

    }

    public List<ThicknessHistoryResponse> getThicknessHistory(String tankId) {

        log.debug("Fetching thickness history for tank {}", tankId);

        if (tankId == null || tankId.trim().isEmpty()) {
            throw new IllegalArgumentException("tankId must not be null or empty");
        }

        var tank = tankRepository.findByTankId(tankId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        return corrosionMapper.toThicknessResponseList(
                thicknessRepo.findByTank_TankIdOrderByMeasurementYearAsc(tank.getTankId())
        );
    }

    public Page<InspectionResponse> getInspections(
            String tankId,
            Pageable pageable
    ) {

        log.debug("Fetching inspections for tank {}", tankId);

        if (tankId == null || tankId.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "tankId must not be null or empty"
            );
        }

        var tank = tankRepository.findByTankId(tankId.trim())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Tank", tankId));

        Pageable sortedPageable = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return inspectionRepository
                .findByTankIdOrderByCreatedAtDescIdDesc(
                        tank.getId(),
                        sortedPageable
                )
                .map(inspection -> {

                    InspectionResponse response =
                            inspectionMapper.toResponse(inspection);

                    ingestionJobRepository
                            .findTopByInspectionIdAndTankIdOrderByCommittedAtDesc(
                                    inspection.getId(),
                                    tank.getId()
                            )
                            .ifPresent(job -> {

                                response.setIngestionJobId(
                                        job.getId().longValue()
                                );

                                response.setDatasetFilename(
                                        job.getSourceFilename()
                                );

                                response.setDatasetUrl(
                                        "/api/ingestion/jobs/" + job.getId()
                                );
                            });

                    return response;
                });
    }


    @Transactional
    public TankResponse updateTankStatus(String tankId, Map<String, String> statusBody) {

        if (tankId == null || tankId.trim().isEmpty()) {
            throw new IllegalArgumentException("tankId must not be null or empty");
        }

        var tank = tankRepository.findByTankId(tankId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        // Update operational status
        if (statusBody != null && statusBody.containsKey("operationalStatus")) {
            String value = statusBody.get("operationalStatus");

            try {
                tank.setOperationalStatus(
                        Tank.OperationalStatus.valueOf(value.trim().toUpperCase())
                );
            } catch (Exception e) {
                throw new BusinessException("Invalid operationalStatus: " + value);
            }
        }

        // Update compliance status
        if (statusBody != null && statusBody.containsKey("complianceStatus")) {
            String value = statusBody.get("complianceStatus");

            try {
                tank.setComplianceStatus(
                        Tank.ComplianceStatus.valueOf(value.trim().toUpperCase())
                );
            } catch (Exception e) {
                throw new BusinessException("Invalid complianceStatus: " + value);
            }
        }

        // No explicit save needed in most JPA setups (managed entity)
        // tankRepository.save(tank);

        return tankMapper.toTankResponse(tank);
    }

    @Transactional(readOnly = true)
    public List<AuditEvent> getTankTimeline(String tankId) {
        if (!tankRepository.existsByTankId(tankId)) {
            throw new ResourceNotFoundException("Tank", tankId);
        }

        return auditEventRepository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(
                "Tank", tankId);
    }

    /**
     * Returns computed health indicators for the tank.
     * Reads from the latest CorrosionAssessment and latest Inspection.
     */
    public TankIndicatorsResponse getTankIndicators(String tankId) {
        Tank tank = tankRepository.findByTankId(tankId)
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        var assessmentOpt = corrosionRepo.findLatestByTankId(tank.getId());

        BigDecimal remainingLife  = null;
        BigDecimal corrosionRate  = null;
        boolean    actionRequired = false;

        if (assessmentOpt.isPresent()) {
            var ca = assessmentOpt.get();
            remainingLife  = ca.getOverallRemainingLifeYr();
            corrosionRate  = ca.getShellCorrRateMmYr();
            actionRequired = (remainingLife != null && remainingLife.doubleValue() <= 0);
        }

        // Latest inspection status
        String inspectionStatus = inspectionRepository
                .findTopByTankIdOrderByCreatedAtDesc(tank.getId())
                .map(i -> i.getStatus().name())
                .orElse("NO_INSPECTION");

        return TankIndicatorsResponse.builder()
                .remainingLife(remainingLife)
                .corrosionRate(corrosionRate)
                .actionRequired(actionRequired)
                .inspectionStatus(inspectionStatus)
                .complianceStatus(tank.getComplianceStatus().name())
                .build();
    }


// ── (2) getTankDocuments — TR-001 ─────────────────────────────

    /**
     * Returns documents linked to this tank.
     * Requires: DocumentRepository injected into TankService.
     */
    public List<DocumentResponse> getTankDocuments(String tankId) {
        Tank tank = tankRepository.findByTankId(tankId)
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        return documentRepository.findByTankId(tank.getId())
                .stream()
                .map(doc -> DocumentResponse.builder()
                        .id(doc.getId())
                        .title(doc.getTitle())
                        .filename(doc.getFilename())
                        .docType(doc.getDocType() != null ? doc.getDocType().getCode() : null)
                        .version(doc.getVersion())
                        .uploadedBy(doc.getUploadedBy() != null ? doc.getUploadedBy().getFullName() : null)
                        .uploadedAt(doc.getUploadedAt())
                        .build())
                .toList();
    }


// ── (3) reopenLatestInspection — AUD-001 ─────────────────────

    /**
     * Reopens the most-recent non-CANCELLED inspection for the tank.
     * Frontend calls POST /api/tanks/{tankId}/reopen instead of the
     * inspection-level endpoint.
     */
    @Transactional
    public InspectionResponse reopenLatestInspection(String tankId, ReopenInspectionRequest req) {
        Tank tank = tankRepository.findByTankId(tankId)
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        var latestInspection = inspectionRepository
                .findTopByTankIdOrderByCreatedAtDesc(tank.getId())
                .orElseThrow(() -> new BusinessException("No inspection found for tank " + tankId));

        // Delegate to InspectionService.reopen()
        return inspectionService.reopenInspection(latestInspection.getId(), req);
    }
    /**
     * Resolves the latest APPROVED (or most-recent) compliance report for
     * this tank and delegates to ComplianceZipService.
     * Frontend calls GET /api/tanks/{tankId}/compliance-pack.
     */
    public ResponseEntity<byte[]> downloadCompliancePack(String tankId) {
        Tank tank = tankRepository.findByTankId(tankId)
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        // Find latest report for this tank
        var report = complianceReportRepository
                .findTopByTankIdOrderByGeneratedAtDesc(tank.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No compliance report found for tank " + tankId));

        byte[] zip = complianceZipService.buildCompliancePack(report.getId());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"compliance_pack_" + tankId + ".zip\"")
                .contentLength(zip.length)
                .body(zip);
    }

// ── (5) fix getTankAuditLog — AUD-002 casing ─────────────────
// REPLACE existing getTankAuditLog to search BOTH "TANK" and "Tank"
// so the casing inconsistency is handled transparently:

    public List<AuditEvent> getTankAuditLog(String tankId) {
        // Resolve business tankId → numeric PK string for audit_events.entity_id
        var tank = tankRepository.findByTankId(tankId).orElse(null);
        String entityId = (tank != null) ? tank.getId().toString() : tankId;

        // Query with both casings (entity_type inconsistency fix)
        List<AuditEvent> events = auditEventRepository
                .findByEntityTypeAndEntityIdOrderByOccurredAtDesc("TANK", entityId);
        if (events.isEmpty()) {
            events = auditEventRepository
                    .findByEntityTypeAndEntityIdOrderByOccurredAtDesc("Tank", entityId);
        }
        return events;
    }
    public List<CriticalAreaResponse> getCriticalAreas(String tankId) {
        log.debug("Fetching critical areas for tank {}", tankId);

        if (tankId == null || tankId.trim().isEmpty()) {
            throw new IllegalArgumentException("tankId must not be null or empty");
        }

        Tank tank = tankRepository.findByTankId(tankId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        // Fetch top 10 critical areas specific to this tank
        return corrosionAssessmentRepository.getCriticalAreasByTankId(
                tank.getTankId(),
                PageRequest.of(0, 10)
        );
    }

    // ── NEW: getThicknessTrend ───────────────────────────────────────────────

    public List<ThicknessTrendResponse> getThicknessTrend(String tankId) {
        log.debug("Fetching thickness trend for tank {}", tankId);

        if (tankId == null || tankId.trim().isEmpty()) {
            throw new IllegalArgumentException("tankId must not be null or empty");
        }

        Tank tank = tankRepository.findByTankId(tankId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        // Fetch the specific tank's trend data
        return thicknessRepo.getThicknessTrendByTankId(tank.getTankId());
    }

    // ── NEW: getTankActivityFeed ──────────────────────────────────────────────

    public Page<ActivityFeedResponse> getTankActivityFeed(String tankId, Pageable pageable) {
        log.debug("Fetching activity feed for tank {}", tankId);

        if (tankId == null || tankId.trim().isEmpty()) {
            throw new IllegalArgumentException("tankId must not be null or empty");
        }

        // 1. Resolve string ID (e.g., "T-101") to the internal database entity
        Tank tank = tankRepository.findByTankId(tankId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        // 2. Fetch from repository using the internal numeric ID and map to Response
        return activityFeedRepository.findByTank_TankIdOrderByOccurredAtDesc(tank.getTankId(), pageable)
                .map(a -> ActivityFeedResponse.builder()
                        .id(a.getId())
                        .tankId(a.getTank() != null ? a.getTank().getTankId() : null)
                        .userFullName(a.getUser() != null ? a.getUser().getFullName() : null)
                        .activityType(a.getActivityType() != null ? a.getActivityType().name() : null)
                        .title(a.getTitle())
                        .detail(a.getDetail())
                        .occurredAt(a.getOccurredAt())
                        .build());
    }

    // ── NEW: getLifeDistribution ──────────────────────────────────────────────

    public LifeDistributionResponse getLifeDistribution(String tankId) {
        log.debug("Fetching life distribution for tank {}", tankId);

        if (tankId == null || tankId.trim().isEmpty()) {
            throw new IllegalArgumentException("tankId must not be null or empty");
        }

        Tank tank = tankRepository.findByTankId(tankId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        // Fetch data specifically for this tank
        List<Object[]> rows = corrosionAssessmentRepository.getLifeDistributionByTankId(tank.getTankId());

        long total = rows.stream()
                .mapToLong(r -> ((Long) r[1]))
                .sum();

        List<LifeDistributionItemResponse> distribution = rows.stream()
                .map(r -> {
                    String bucket = (String) r[0];
                    long count = (Long) r[1];

                    double percent = total == 0 ? 0 : (count * 100.0) / total;

                    String color = switch (bucket) {
                        case "< 5 years" -> "#ef4444";
                        case "5–10 years" -> "#f97316";
                        case "10–20 years" -> "#3b82f6";
                        default -> "#22c55e";
                    };

                    return LifeDistributionItemResponse.builder()
                            .name(bucket)
                            .value(count)
                            .count(count)
                            .percent(Math.round(percent))
                            .color(color)
                            .build();
                })
                .toList();

        return LifeDistributionResponse.builder()
                .distribution(distribution)
                .build();
    }

    // ── NEW: getTankMetrics ───────────────────────────────────────────────────

    public TankMetricsResponse getTankMetrics(String tankId) {
        log.debug("Computing KPI metrics for tank {}", tankId);

        if (tankId == null || tankId.trim().isEmpty()) {
            throw new IllegalArgumentException("tankId must not be null or empty");
        }

        Tank tank = tankRepository.findByTankId(tankId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        // Get latest assessment for rates and life
        var assessmentOpt = corrosionRepo.findLatestByTankId(tank.getId());

        BigDecimal minThickness = null;
        BigDecimal corrosionRate = null;
        BigDecimal remainingLife = null;

        if (assessmentOpt.isPresent()) {
            var ca = assessmentOpt.get();
            minThickness = ca.getShellMinThicknessMm();
            corrosionRate = ca.getShellCorrRateMmYr();
            remainingLife = ca.getOverallRemainingLifeYr();
        }

        // Count critical areas for this tank
        // (You can use your existing getCriticalAreasByTankId query and check the size)
        int criticalAreasCount = corrosionRepo.getCriticalAreasByTankId(
                tank.getTankId(),
                PageRequest.of(0, 100)
        ).size();

        return TankMetricsResponse.builder()
                .minThickness(minThickness)
                .corrosionRate(corrosionRate)
                .remainingLife(remainingLife)
                .criticalAreas(criticalAreasCount)
                .complianceStatus(tank.getComplianceStatus() != null ? tank.getComplianceStatus().name() : "UNKNOWN")
                // Note: Trends are left null here. You could calculate them by comparing
                // the latest CorrosionAssessment to the previous one if needed.
                .build();
    }

    public Map<String, Object> getTankHeatmap(String tankId) {
        log.debug("Fetching heatmap data for tank {}", tankId);

        Tank tank = tankRepository.findByTankId(tankId)
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

        // Note: Since you use a placeholder in React right now, we return a dummy response.
        // Once you build the actual grid data (e.g., from shell courses), you map it here.
        return Map.of(
                "tankId", tank.getTankId(),
                "status", "Placeholder data for React Heatmap Grid"
        );
    }
}

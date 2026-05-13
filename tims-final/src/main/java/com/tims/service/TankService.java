package com.tims.service;
import com.tims.audit.AuditEvent;
import com.tims.audit.AuditEventRepository;
import com.tims.dto.request.ReopenInspectionRequest;
import com.tims.dto.response.*;
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

    public TankResponse getTank(String tankId) {
        log.debug("Fetching tank {}", tankId);
        Tank t = tankRepository.findByTankId(tankId)
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));

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
                t.getCreatedAt()
//                t.getId().shortValue(),
//
//                // FIX 1: SITE
//                t.getSite() != null ? t.getSite().getName() : null,
//
//                // FIX 2: PRODUCT SERVICE
//                t.getProductService() != null ? t.getProductService().getName() : null,
//
//                // FIX 3: RISK CATEGORY
//                t.getRiskCategory() != null ? t.getRiskCategory().getCode() : null,
//
//                String.valueOf(t.getOperationalStatus()),
//                String.valueOf(t.getComplianceStatus()),
//                t.getDiameterM(),
//                t.getHeightM(),
//                t.getCapacityM3(),
//                t.getYearBuilt()
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
                thicknessRepo.findByTankIdOrderByMeasurementYearAsc(tank.getId())
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
    public List<AuditEvent> getTankTimeline(Short tankId) {
        if (!tankRepository.existsById(tankId)) {
            throw new ResourceNotFoundException("Tank", tankId);
        }

        return auditEventRepository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(
                "Tank", tankId.toString());
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
}

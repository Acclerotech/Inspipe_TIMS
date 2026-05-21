package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.dto.request.*;
import com.tims.dto.response.*;
import com.tims.entity.*;
import com.tims.exception.*;
import com.tims.mapper.InspectionMapper;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class InspectionService {

    private static final Map<Inspection.Status, Set<Inspection.Status>> TRANSITIONS = Map.of(
            Inspection.Status.PLANNED, Set.of(Inspection.Status.IN_PROGRESS, Inspection.Status.CANCELLED),
            Inspection.Status.IN_PROGRESS, Set.of(Inspection.Status.COMPLETED, Inspection.Status.CANCELLED),
            Inspection.Status.COMPLETED, Set.of(Inspection.Status.APPROVED),
            Inspection.Status.APPROVED, Set.of(Inspection.Status.REOPENED),
            Inspection.Status.REOPENED, Set.of(Inspection.Status.IN_PROGRESS),
            Inspection.Status.CANCELLED, Set.of()
    );

    private final InspectionRepository inspectionRepository;
    private final TankRepository tankRepository;
    private final InspectionTypeRepository inspectionTypeRepository;
    private final ComplianceStandardRepository standardRepository;
    private final UserRepository userRepository;
    private final VwInspectionCalendarRepository calendarRepository;
    private final InspectionMapper inspectionMapper;
    private final AuditService auditService;
    private final InspectionAlertRepository alertRepository;

    // ─────────────────────────────────────────────
    // READ: CALENDAR
    // ─────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<InspectionCalendarResponse> getCalendar(Short fromWeek, Short toWeek) {

        LocalDate today = LocalDate.now();
        LocalDate toDate = today.plusDays(30);

        var views = calendarRepository.findByDateRange(today, toDate);

        return inspectionMapper.toCalendarResponseList(views);
    }

    @Transactional(readOnly = true)
    public Page<InspectionResponse> getAll(String tankId, String status, Pageable pageable) {

        Page<Inspection> page = inspectionRepository.findAll(pageable);

        return page.map(inspectionMapper::toResponse);
    }

    // ─────────────────────────────────────────────
    // READ: BY ID (ADDED)
    // ─────────────────────────────────────────────
    @Transactional(readOnly = true)
    public InspectionResponse getById(Integer id) {
        return inspectionMapper.toResponse(findById(id));
    }

    // ─────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────
    public InspectionResponse createInspection(CreateInspectionRequest req) {

        log.info("Creating inspection for tank {}", req.getTankId());

        var tank = tankRepository.findByTankId(req.getTankId())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", req.getTankId()));

        var type = inspectionTypeRepository.findById(req.getInspectionTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("InspectionType", req.getInspectionTypeId()));

        var standard = standardRepository.findById(req.getStandardId())
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceStandard", req.getStandardId()));

        var inspector = userRepository.findById(req.getInspectorId())
                .orElseThrow(() -> new ResourceNotFoundException("User", req.getInspectorId()));

        var inspection = Inspection.builder()
                .tank(tank)
                .inspectionType(type)
                .standard(standard)
                .inspector(inspector)
                .plannedDate(req.getPlannedDate())
                .weekNumber(req.getWeekNumber())
                .intervalYears(req.getIntervalYears())
                .intervalBasis(req.getIntervalBasis())
                .notes(req.getNotes())
                .status(Inspection.Status.PLANNED)
                .build();

        if (req.getScopeItems() != null) {
            req.getScopeItems().forEach(item ->
                    inspection.getScopeItems().add(
                            InspectionScopeItem.builder()
                                    .inspection(inspection)
                                    .scopeItem(item)
                                    .completed(false)
                                    .build()
                    )
            );
        }

        var saved = inspectionRepository.save(inspection);

        auditService.record(
                "Inspection",
                saved.getId().toString(),
                AuditEvent.Action.CREATE,
                null,
                saved
        );

        log.info("Inspection {} created", saved.getId());

        return inspectionMapper.toResponse(saved);
    }
//--------------------------------------------------

    public InspectionResponse updateInspection(Integer inspectionId, UpdateInspectionRequest req) {

        log.info("Updating inspection {}", inspectionId);

        var inspection = findById(inspectionId);

        if (inspection.getStatus() == Inspection.Status.APPROVED) {
            throw new ImmutableEntityException(
                    "Approved inspection cannot be edited. Reopen first.");
        }

        var before = inspectionMapper.toResponse(inspection);

        // -------------------------
        // Update simple fields
        // -------------------------
        if (req.getPlannedDate() != null)
            inspection.setPlannedDate(req.getPlannedDate());

        if (req.getActualDate() != null)
            inspection.setActualDate(req.getActualDate());

        if (req.getWeekNumber() != null)
            inspection.setWeekNumber(req.getWeekNumber());

        if (req.getIntervalYears() != null)
            inspection.setIntervalYears(req.getIntervalYears());

        if (req.getIntervalBasis() != null)
            inspection.setIntervalBasis(req.getIntervalBasis());

        if (req.getNotes() != null)
            inspection.setNotes(req.getNotes());

        // -------------------------
        // Relations updates
        // -------------------------
        if (req.getInspectionTypeId() != null) {
            var type = inspectionTypeRepository.findById(req.getInspectionTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("InspectionType", req.getInspectionTypeId()));
            inspection.setInspectionType(type);
        }

        if (req.getStandardId() != null) {
            var standard = standardRepository.findById(req.getStandardId())
                    .orElseThrow(() -> new ResourceNotFoundException("ComplianceStandard", req.getStandardId()));
            inspection.setStandard(standard);
        }

        if (req.getInspectorId() != null) {
            var inspector = userRepository.findById(req.getInspectorId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", req.getInspectorId()));
            inspection.setInspector(inspector);
        }

        // -------------------------
        // Scope replace (IMPORTANT FIX)
        // -------------------------
        if (req.getScopeItems() != null) {

            inspection.getScopeItems().clear();

            req.getScopeItems().forEach(item ->
                    inspection.getScopeItems().add(
                            InspectionScopeItem.builder()
                                    .inspection(inspection)
                                    .scopeItem(item)
                                    .completed(false)
                                    .build()
                    )
            );
        }

        var saved = inspectionRepository.save(inspection);

        auditService.record(
                "Inspection",
                saved.getId().toString(),
                AuditEvent.Action.UPDATE,
                before,
                inspectionMapper.toResponse(saved)
        );

        return inspectionMapper.toResponse(saved);
    }
    //----------------------------------------------
    // ─────────────────────────────────────────────
    // UPDATE STATUS
    // ─────────────────────────────────────────────
    public InspectionResponse updateStatus(Integer inspectionId, UpdateInspectionStatusRequest req) {

        log.info("Updating inspection {} to {}", inspectionId, req.getStatus());

        var inspection = findById(inspectionId);

        if (inspection.getStatus() == Inspection.Status.APPROVED) {
            throw new ImmutableEntityException(
                    "Inspection " + inspectionId + " is APPROVED and read-only."
            );
        }

        Inspection.Status newStatus = parseStatus(req.getStatus());
        enforceTransition(inspection.getStatus(), newStatus);

        var before = inspectionMapper.toResponse(inspection);

        inspection.setStatus(newStatus);

        if (req.getActualDate() != null) inspection.setActualDate(req.getActualDate());
        if (req.getNotes() != null) inspection.setNotes(req.getNotes());

        if (newStatus == Inspection.Status.APPROVED) {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();

            var approver = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("User: " + email));

            inspection.setApprovedBy(approver);
            inspection.setApprovedAt(LocalDateTime.now());
        }

        var saved = inspectionRepository.save(inspection);

        auditService.record(
                "Inspection",
                saved.getId().toString(),
                AuditEvent.Action.STATUS_CHANGE,
                before,
                inspectionMapper.toResponse(saved)
        );

        return inspectionMapper.toResponse(saved);
    }

    // ─────────────────────────────────────────────
    // REOPEN
    // ─────────────────────────────────────────────
    public InspectionResponse reopenInspection(Integer inspectionId, ReopenInspectionRequest req) {

        log.info("Re-opening inspection {}", inspectionId);

        if (req.getReason() == null || req.getReason().isBlank()) {
            throw new BusinessException("Reason is mandatory for REOPEN");
        }

        var inspection = findById(inspectionId);

        if (inspection.getStatus() != Inspection.Status.APPROVED) {
            throw new BusinessException("Only APPROVED inspections can be re-opened");
        }

        var before = inspectionMapper.toResponse(inspection);

        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        inspection.setStatus(Inspection.Status.REOPENED);
        inspection.setReopenReason(req.getReason());
        inspection.setReopenCount(inspection.getReopenCount() + 1);
        inspection.setReopenedByEmail(email);
        inspection.setReopenedAt(LocalDateTime.now());
        inspection.setApprovedBy(null);
        inspection.setApprovedAt(null);

        var saved = inspectionRepository.save(inspection);

        var after = inspectionMapper.toResponse(saved);

        auditService.record(
                "Inspection",
                saved.getId().toString(),
                AuditEvent.Action.REOPEN,
                before,
                after,
                req.getReason()
        );

        return after;
    }

    // ─────────────────────────────────────────────
    // CONFLICTS
    // ─────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<InspectionConflictResponse> getConflicts(boolean unreadOnly) {

        return alertRepository.findConflictAlerts(unreadOnly)
                .stream()
                .map(alert -> InspectionConflictResponse.builder()
                        .alertId(alert.getId())
                        .inspectionId(alert.getInspection() != null ? alert.getInspection().getId() : null)
                        .tankId(alert.getTank().getTankId())
                        .inspectorName(alert.getAssignedTo() != null ? alert.getAssignedTo().getFullName() : null)
                        .plannedDate(alert.getInspection() != null ? alert.getInspection().getPlannedDate() : null)
                        .proposedDate(alert.getProposedDate())
                        .message(alert.getMessage())
                        .read(alert.isRead())
                        .createdAt(alert.getCreatedAt())
                        .build())
                .toList();
    }

    // ─────────────────────────────────────────────
    // INTERNAL HELPERS
    // ─────────────────────────────────────────────
    private Inspection findById(Integer id) {
        return inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection", id));
    }

    private Inspection.Status parseStatus(String raw) {
        try {
            return Inspection.Status.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid status: " + raw);
        }
    }

    private void enforceTransition(Inspection.Status from, Inspection.Status to) {
        var allowed = TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw new InvalidStateTransitionException(from.name(), to.name());
        }
    }


    public TemplateRecommendationResponse recommendTemplate(TemplateRecommendationRequest req) {

        log.info("Template recommendation started for tank {}", req.getTankId());

        Tank tank = tankRepository.findByTankId(req.getTankId())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", req.getTankId()));

        // ----------------------------
        // Derived features from Tank entity
        // ----------------------------
        int yearBuilt = tank.getYearBuilt() != null ? tank.getYearBuilt() : 0;
        int age = (yearBuilt > 0)
                ? java.time.LocalDate.now().getYear() - yearBuilt
                : 0;

        Tank.ComplianceStatus complianceStatus = tank.getComplianceStatus();
        Tank.OperationalStatus operationalStatus = tank.getOperationalStatus();
        Byte criticality = tank.getCriticalityTier();

        String service = tank.getProductService() != null
                ? tank.getProductService().getName()
                : "UNKNOWN";

        String riskCategory = tank.getRiskCategory() != null
                ? tank.getRiskCategory().getCode()
                : "MEDIUM";

        // ----------------------------
        // Scoring engine
        // ----------------------------
        int riskScore = 0;

        // Age factor
        if (age > 25) riskScore += 3;
        else if (age > 15) riskScore += 2;
        else if (age > 5) riskScore += 1;

        // Compliance factor
        if (complianceStatus == Tank.ComplianceStatus.OVERDUE) riskScore += 3;
        else if (complianceStatus == Tank.ComplianceStatus.ACTION_REQUIRED) riskScore += 2;

        // Operational factor
        if (operationalStatus == Tank.OperationalStatus.OUT_OF_SERVICE) riskScore += 2;
        if (operationalStatus == Tank.OperationalStatus.DECOMMISSIONED) riskScore += 3;

        // Criticality factor
        if (criticality != null && criticality >= 4) riskScore += 2;

        // Risk category factor
        if ("HIGH".equalsIgnoreCase(riskCategory)) riskScore += 2;

        // ----------------------------
        // Decision logic
        // ----------------------------
        String templateCode;
        String reason;
        double confidence;

        if (riskScore >= 7) {
            templateCode = "ILS";
            reason = "High combined risk (age/compliance/criticality) requires integrated inspection strategy.";
            confidence = 0.92;
        }
        else if (riskScore >= 4) {
            templateCode = "FFS";
            reason = "Moderate risk asset requiring Fitness-for-Service assessment per API 579.";
            confidence = 0.78;
        }
        else {
            templateCode = "WSE";
            reason = "Low risk asset suitable for wall thickness evaluation.";
            confidence = 0.65;
        }

        // ----------------------------
        // Response
        // ----------------------------
        return TemplateRecommendationResponse.builder()
                .templateCode(templateCode)
                .templateId(templateCode.toLowerCase())
                .templateName(resolveTemplateName(templateCode))
                .reason(reason)
                .confidenceScore(confidence)
                .recommendationStrategy("RULE_ENGINE_V2")
                .build();
    }
    private String resolveTemplateName(String code) {
        return switch (code) {
            case "WSE" -> "Wall Thickness Evaluation";
            case "FFS" -> "Fitness for Service";
            case "ILS" -> "Inline Service Evaluation";
            default -> "Unknown";
        };
    }

    @Transactional(readOnly = true)
    public List<InspectionTypeResponse> getInspectionTypes() {

        return inspectionTypeRepository.findAll()
                .stream()
                .map(this::toInspectionTypeResponse)
                .toList();
    }
    private InspectionTypeResponse toInspectionTypeResponse(InspectionType entity) {

        return InspectionTypeResponse.builder()
                .id(entity.getId().intValue())
                .code(entity.getCode())
                .name(entity.getLabel())
                .description(null) // not available in entity
                .category(null)    // not in entity yet
                .color(entity.getColorHex())
                .active(true)      // default until DB column added
                .build();
    }
    @Transactional(readOnly = true)
    public List<InspectionStandardResponse> getInspectionStandards() {

        return standardRepository.findAll()
                .stream()
                .map(this::toInspectionStandardResponse)
                .toList();
    }
    private InspectionStandardResponse toInspectionStandardResponse(ComplianceStandard entity) {

        return InspectionStandardResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .label(entity.getLabel())
                .edition(entity.getEdition())
                .build();
    }

    @Transactional(readOnly = true)
    public List<InspectionTemplateResponse> getTemplates() {

        return List.of(
                InspectionTemplateResponse.builder()
                        .id("wse")
                        .code("WSE")
                        .name("Wall Thickness Evaluation")
                        .description("Assess remaining wall thickness and corrosion-driven life estimation.")
                        .color("blue")
                        .build(),

                InspectionTemplateResponse.builder()
                        .id("ffs")
                        .code("FFS")
                        .name("Fitness for Service")
                        .description("Structural integrity evaluation based on API 579 standards.")
                        .color("green")
                        .build(),

                InspectionTemplateResponse.builder()
                        .id("ils")
                        .code("ILS")
                        .name("Inline Service Evaluation")
                        .description("Integrated inspection combining risk, corrosion, and FFS analysis.")
                        .color("purple")
                        .build()
        );
    }
   }
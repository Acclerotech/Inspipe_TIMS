package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.dto.request.CreateInspectionRequest;
import com.tims.dto.request.ReopenInspectionRequest;
import com.tims.dto.request.UpdateInspectionStatusRequest;
import com.tims.dto.response.InspectionCalendarResponse;
import com.tims.dto.response.InspectionConflictResponse;
import com.tims.dto.response.InspectionResponse;
import com.tims.entity.*;
import com.tims.exception.*;
import com.tims.mapper.InspectionMapper;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class InspectionService {

    private static final Map<Inspection.Status, Set<Inspection.Status>> TRANSITIONS = Map.of(
        Inspection.Status.PLANNED,     Set.of(Inspection.Status.IN_PROGRESS, Inspection.Status.CANCELLED),
        Inspection.Status.IN_PROGRESS, Set.of(Inspection.Status.COMPLETED, Inspection.Status.CANCELLED),
        Inspection.Status.COMPLETED,   Set.of(Inspection.Status.APPROVED),
        Inspection.Status.APPROVED,    Set.of(Inspection.Status.REOPENED),
        Inspection.Status.REOPENED,    Set.of(Inspection.Status.IN_PROGRESS),
        Inspection.Status.CANCELLED,   Set.of()
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

    @Transactional(readOnly = true)
    public List<InspectionCalendarResponse> getCalendar(Short fromWeek, Short toWeek) {

        LocalDate today = LocalDate.now();
        LocalDate toDate = today.plusDays(30);

        var views = calendarRepository.findByDateRange(today, toDate);

        return inspectionMapper.toCalendarResponseList(views);
    }

    public InspectionResponse createInspection(CreateInspectionRequest req) {
        log.info("Creating inspection for tank {}", req.getTankId());
        var tank = tankRepository.findById(req.getTankId())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", req.getTankId()));
        var type = inspectionTypeRepository.findById(req.getInspectionTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("InspectionType", req.getInspectionTypeId()));
        var standard = standardRepository.findById(req.getStandardId())
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceStandard", req.getStandardId()));
        var inspector = userRepository.findById(req.getInspectorId())
                .orElseThrow(() -> new ResourceNotFoundException("User", req.getInspectorId()));

        var inspection = Inspection.builder()
                .tank(tank).inspectionType(type).standard(standard).inspector(inspector)
                .plannedDate(req.getPlannedDate()).weekNumber(req.getWeekNumber())
                .intervalYears(req.getIntervalYears()).intervalBasis(req.getIntervalBasis())
                .notes(req.getNotes()).status(Inspection.Status.PLANNED).build();

        if (req.getScopeItems() != null) {
            req.getScopeItems().forEach(item ->
                inspection.getScopeItems().add(
                    InspectionScopeItem.builder()
                        .inspection(inspection).scopeItem(item).completed(false).build()));
        }
        var saved = inspectionRepository.save(inspection);
        auditService.record("Inspection", saved.getId().toString(), AuditEvent.Action.CREATE, null, saved);
        log.info("Inspection {} created", saved.getId());
        return inspectionMapper.toResponse(saved);
    }

    public InspectionResponse updateStatus(Integer inspectionId, UpdateInspectionStatusRequest req) {
        log.info("Updating inspection {} to {}", inspectionId, req.getStatus());
        var inspection = findById(inspectionId);

        if (inspection.getStatus() == Inspection.Status.APPROVED) {
            throw new ImmutableEntityException(
                "Inspection " + inspectionId + " is APPROVED and read-only. " +
                "Use POST /api/inspections/" + inspectionId + "/reopen to re-open it.");
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
        auditService.record("Inspection", saved.getId().toString(), AuditEvent.Action.STATUS_CHANGE,
                before, inspectionMapper.toResponse(saved));
        return inspectionMapper.toResponse(saved);
    }

    public InspectionResponse reopenInspection(Integer inspectionId, ReopenInspectionRequest req) {
        log.info("Re-opening inspection {}", inspectionId);
        if (req.getReason() == null || req.getReason().isBlank())
            throw new BusinessException("Reason is mandatory for REOPEN");
        var inspection = findById(inspectionId);
        if (inspection.getStatus() != Inspection.Status.APPROVED)
            throw new BusinessException("Only APPROVED inspections can be re-opened; current: " + inspection.getStatus());

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
        auditService.record("Inspection", saved.getId().toString(), AuditEvent.Action.REOPEN,
                before, after, req.getReason());
        log.info("Inspection {} re-opened by {} reason: {}", inspectionId, email, req.getReason());
        return after;
    }

    private Inspection findById(Integer id) {
        return inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection", id));
    }
    private Inspection.Status parseStatus(String raw) {
        try { return Inspection.Status.valueOf(raw.toUpperCase()); }
        catch (IllegalArgumentException e) { throw new BusinessException("Invalid status: " + raw); }
    }
    private void enforceTransition(Inspection.Status from, Inspection.Status to) {
        var allowed = TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) throw new InvalidStateTransitionException(from.name(), to.name());
    }

    @Transactional(readOnly = true)
    public List<InspectionConflictResponse> getConflicts(boolean unreadOnly) {

        return alertRepository.findConflictAlerts(unreadOnly)
                .stream()
                .map(alert -> InspectionConflictResponse.builder()
                        .alertId(alert.getId())
                        .inspectionId(
                                alert.getInspection() != null
                                        ? alert.getInspection().getId()
                                        : null
                        )
                        .tankId(alert.getTank().getTankId())
                        .inspectorName(
                                alert.getAssignedTo() != null
                                        ? alert.getAssignedTo().getFullName()
                                        : null
                        )
                        .plannedDate(
                                alert.getInspection() != null
                                        ? alert.getInspection().getPlannedDate()
                                        : null
                        )
                        .proposedDate(alert.getProposedDate())
                        .message(alert.getMessage())
                        .read(alert.isRead())
                        .createdAt(alert.getCreatedAt())
                        .build())
                .toList();
    }
}

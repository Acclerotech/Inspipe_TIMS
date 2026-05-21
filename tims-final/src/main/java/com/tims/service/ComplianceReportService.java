package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.dto.request.CreateReportRequest;
import com.tims.dto.request.FlexCreateReportRequest;
import com.tims.dto.response.ComplianceReportResponse;
import com.tims.entity.*;
import com.tims.exception.*;
import com.tims.mapper.ReportMapper;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ComplianceReportService {

    private final ComplianceReportRepository reportRepository;
    private final TankRepository tankRepository;
    private final ReportTemplateRepository templateRepository;
    private final ComplianceStandardRepository standardRepository;
    private final UserRepository userRepository;
    private final ReportMapper reportMapper;
    private final AuditService auditService;
    private final AlertService alertService;

    @Transactional(readOnly = true)
    public Page<ComplianceReportResponse> listReports(String tankId, Pageable pageable) {

        if (tankId != null && !tankId.isBlank()) {
            return reportRepository
                    .findByTankId(tankId, pageable)
                    .map(reportMapper::toResponse);
        }

        return reportRepository
                .findAll(pageable)
                .map(reportMapper::toResponse);
    }
    @Transactional(readOnly = true)
    public ComplianceReportResponse getReport(Integer reportId) {
        return reportMapper.toResponse(findReport(reportId));
    }

    public ComplianceReportResponse createReport(CreateReportRequest req) {
        log.info("Creating report ref={}", req.getReportRef());
        if (reportRepository.existsByReportRef(req.getReportRef()))
            throw new BusinessException("Report ref already exists: " + req.getReportRef());

        var tank = tankRepository.findByTankId(req.getTankId()).orElseThrow(() -> new ResourceNotFoundException("Tank", req.getTankId()));
        var template = templateRepository.findById(req.getTemplateId()).orElseThrow(() -> new ResourceNotFoundException("ReportTemplate", req.getTemplateId()));
        var standard = standardRepository.findById(req.getStandardId()).orElseThrow(() -> new ResourceNotFoundException("ComplianceStandard", req.getStandardId()));
        var email = SecurityContextHolder.getContext().getAuthentication().getName();
        var author = userRepository.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User: " + email));

        var report = ComplianceReport.builder().tank(tank).template(template).standard(standard)
                .reportRef(req.getReportRef()).inspectionDate(req.getInspectionDate())
                .units(req.getUnits() != null ? req.getUnits() : "mm, mm/yr")
                .status(ComplianceReport.Status.DRAFT).generatedBy(author).build();

        if (req.getSectionNames() != null) {
            AtomicReference<Byte> order = new AtomicReference<>((byte) 1);
            req.getSectionNames().forEach(name -> {
                report.getSections().add(ReportSection.builder().report(report)
                        .sectionName(name).included(true).sortOrder(order.getAndSet((byte)(order.get()+1))).build());
            });
        }

        if (req.getSignatories() != null) {
            req.getSignatories().forEach(entry -> {
                var user = userRepository.findById(entry.getUserId()).orElseThrow(() -> new ResourceNotFoundException("User", entry.getUserId()));
                ReportSignatory.Role role;
                try { role = ReportSignatory.Role.valueOf(entry.getRole().toUpperCase()); }
                catch (IllegalArgumentException e) { throw new BusinessException("Invalid signatory role: " + entry.getRole()); }
                report.getSignatories().add(ReportSignatory.builder().report(report).user(user).role(role).build());
            });
        }

        var saved = reportRepository.save(report);
        auditService.record("ComplianceReport", saved.getId().toString(), AuditEvent.Action.CREATE, null, saved);
        log.info("Report {} created id={}", saved.getReportRef(), saved.getId());

        // ── NEW: Alert the designated signatories ───────────────────────────────
        saved.getSignatories().forEach(signatory -> {
            // Optional: Don't send an alert to the author if they assigned themselves as a signatory
            if (!signatory.getUser().getId().equals(author.getId())) {
                String message = "New report " + saved.getReportRef() + " has been created by " + author.getFullName() + ". You are assigned as a " + signatory.getRole().name() + ".";
                log.info("Creating alert for signatory {}: {}", signatory.getUser().getEmail(), message);
                alertService.createAlert(signatory.getUser(), saved.getTank(), message);
            }
        });

        return reportMapper.toResponse(saved);
    }

    public ComplianceReportResponse signReport(Integer reportId) {
        log.info("Signing report {}", reportId);
        var report = findReport(reportId);
        if (report.getStatus() == ComplianceReport.Status.PUBLISHED)
            throw new BusinessException("Cannot sign a PUBLISHED report");

        var email = SecurityContextHolder.getContext().getAuthentication().getName();
        var currentUser = userRepository.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User: " + email));
        var signatory = report.getSignatories().stream()
                .filter(s -> s.getUser().getId().equals(currentUser.getId())).findFirst()
                .orElseThrow(() -> new BusinessException("Current user is not a signatory of report " + reportId));
        if (signatory.getSignedAt() != null) throw new BusinessException("You have already signed this report");

        var before = reportMapper.toResponse(report);
        signatory.setSignedAt(LocalDateTime.now());
        boolean allSigned = report.getSignatories().stream().allMatch(s -> s.getSignedAt() != null);

        if (allSigned) {
            report.setStatus(ComplianceReport.Status.SIGNED);

            // ── NEW: Alert the creator that the report is fully signed ──────────
            String message = "Report " + report.getReportRef() + " has been fully signed and approved.";
            alertService.createAlert(report.getGeneratedBy(), report.getTank(), message);

        } else {
            if (report.getStatus() == ComplianceReport.Status.DRAFT) {
                report.setStatus(ComplianceReport.Status.UNDER_REVIEW);
            }

            // ── NEW: Alert the creator that someone signed, but others are pending
            String message = currentUser.getFullName() + " signed report " + report.getReportRef() + ". Waiting on others.";
            log.info("Creating alert for report creator {}: {}", report.getGeneratedBy().getEmail(), message);
            alertService.createAlert(report.getGeneratedBy(), report.getTank(), message);
        }

        var saved = reportRepository.save(report);
        auditService.record("ComplianceReport", saved.getId().toString(), AuditEvent.Action.SIGN, before, reportMapper.toResponse(saved));
        return reportMapper.toResponse(saved);
    }


    private ComplianceReport findReport(Integer reportId) {
        return reportRepository.findById(reportId).orElseThrow(() -> new ResourceNotFoundException("ComplianceReport", reportId));
    }
    @Transactional
    public ComplianceReportResponse createReportFlex(FlexCreateReportRequest req) {
        log.info("createReportFlex: tankId={} type={} standard={}",
                req.getTankId(), req.getType(), req.getStandard());

        // ── Resolve templateId ─────────────────────────────────────
        Byte resolvedTemplateId = req.getTemplateId();
        if (resolvedTemplateId == null && req.getType() != null) {
            resolvedTemplateId = templateRepository.findAll().stream()
                    .filter(t -> t.getCode().equalsIgnoreCase(req.getType())
                            || t.getLabel().equalsIgnoreCase(req.getType()))
                    .map(t -> t.getId())
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(
                            "Unknown report type: " + req.getType()
                                    + ". Available: " + templateRepository.findAll().stream()
                                    .map(t -> t.getCode()).toList()));
        }
        if (resolvedTemplateId == null)
            throw new BusinessException("templateId or type must be provided");

        // ── Resolve standardId ─────────────────────────────────────
        Short resolvedStandardId = req.getStandardId();
        if (resolvedStandardId == null && req.getStandard() != null) {
            resolvedStandardId = standardRepository.findAll().stream()
                    .filter(s -> s.getCode().equalsIgnoreCase(req.getStandard())
                            || s.getLabel().equalsIgnoreCase(req.getStandard()))
                    .map(s -> s.getId())
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(
                            "Unknown standard: " + req.getStandard()));
        }
        if (resolvedStandardId == null)
            throw new BusinessException("standardId or standard must be provided");

        // ── Auto-generate reportRef ────────────────────────────────
        String reportRef = req.getReportRef();
        if (reportRef == null || reportRef.isBlank()) {
            reportRef = req.getTankId() + "-"
                    + req.getType()
                    + "-" + java.time.LocalDate.now().getYear();
        }

        // ── Resolve signatories ────────────────────────────────────
        List<CreateReportRequest.SignatoryEntry> signatories = req.getSignatories();

        if ((signatories == null || signatories.isEmpty())
                && req.getApprovers() != null && !req.getApprovers().isEmpty()) {
            signatories = req.getApprovers().stream()
                    .map(approver -> {
                        var entry = new CreateReportRequest.SignatoryEntry();
                        // Resolve userId from full name
                        Short userId = userRepository.findAll().stream()
                                .filter(u -> u.getFullName().equalsIgnoreCase(approver.getName()))
                                .map(u -> u.getId())
                                .findFirst()
                                .orElseThrow(() -> new BusinessException(
                                        "No user found with name: " + approver.getName()));
                        entry.setUserId(userId);
                        entry.setRole(approver.getRole());
                        return entry;
                    })
                    .toList();
        }

        // ── Delegate to canonical createReport ────────────────────
        var canonical = new CreateReportRequest();
        canonical.setTankId(req.getTankId());
        canonical.setTemplateId(resolvedTemplateId);
        canonical.setStandardId(resolvedStandardId);
        canonical.setReportRef(reportRef);
        canonical.setInspectionDate(req.getInspectionDate());
        canonical.setSectionNames(req.getSectionNames());
        canonical.setSignatories(signatories);

        return createReport(canonical);
    }

    // In ComplianceReportService.java
    public ComplianceReportResponse updateStatus(Integer reportId, String newStatus) {
        ComplianceReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceReport", reportId));

        // Convert string to your Enum (assuming you have a ReportStatus enum)
        report.setStatus(ComplianceReport.Status.valueOf(newStatus.toUpperCase()));

        // Save and return
        reportRepository.save(report);
        return toResponse(report); // Assuming you have a mapper
    }
    public ComplianceReportResponse toResponse(ComplianceReport report) {
        if (report == null) {
            return null;
        }

        return ComplianceReportResponse.builder()
                .id(report.getId())
                .reportRef(report.getReportRef())
                .status(report.getStatus() != null ? report.getStatus().name() : null)
                .inspectionDate(report.getInspectionDate())
                .generatedAt(report.getGeneratedAt())

                // Safely extract nested entity data
                .tankId(report.getTank() != null ? report.getTank().getTankId() : null)
                .standardCode(report.getStandard() != null ? report.getStandard().getCode() : null)

                // If your DTO expects a list of signatory names/roles, map them here:
                /*
                .signatories(report.getSignatories().stream()
                        .map(s -> s.getUser().getFullName() + " (" + s.getRole().name() + ")")
                        .collect(Collectors.toList()))
                */
                .build();
    }
}

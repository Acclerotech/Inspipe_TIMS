package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.dto.request.ColumnMappingRequest;
import com.tims.dto.request.UploadIngestionRequest;
import com.tims.dto.response.IngestionJobResponse;
import com.tims.dto.response.IngestionStatusResponse;
import com.tims.dto.response.ValidationResultResponse;
import com.tims.entity.*;
import com.tims.exception.*;
import com.tims.mapper.IngestionMapper;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class IngestionJobService {

    private static final Map<IngestionJob.Status, Set<IngestionJob.Status>> TRANSITIONS = Map.of(
        IngestionJob.Status.UPLOADED,  Set.of(IngestionJob.Status.MAPPING, IngestionJob.Status.FAILED),
        IngestionJob.Status.MAPPING,   Set.of(IngestionJob.Status.VALIDATED, IngestionJob.Status.FAILED),
        IngestionJob.Status.VALIDATED, Set.of(IngestionJob.Status.COMMITTED, IngestionJob.Status.FAILED),
        IngestionJob.Status.COMMITTED, Set.of(),
        IngestionJob.Status.FAILED,    Set.of()
    );

    @Value("${tims.ingestion.raw-storage-path:/data/tims/raw}") private String rawStoragePath;

    private final IngestionJobRepository jobRepository;
    private final IngestionColumnMappingRepository mappingRepository;
    private final RawFileRepository rawFileRepository;
    private final TankRepository tankRepository;
    private final InspectionRepository inspectionRepository;
    private final UserRepository userRepository;
    private final IngestionMapper ingestionMapper;
    private final AuditService auditService;
    private final IngestionValidationPipeline validationPipeline;
    private final MflClassificationService mflClassificationService;
    private final UtReadingRepository utReadingRepository;
    private final CalculationService calculationService;

    @Transactional(readOnly = true)
    public Page<IngestionJobResponse> listJobs(Pageable pageable) {
        return jobRepository.findAll(pageable).map(ingestionMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public IngestionJobResponse getJob(Integer jobId) {
        return ingestionMapper.toResponse(findJob(jobId));
    }

    public IngestionJobResponse upload(MultipartFile file, UploadIngestionRequest req) {
        log.info("Ingestion upload: {}", file.getOriginalFilename());
        var tank = tankRepository.findById(req.getTankId())
                .orElseThrow(() -> new ResourceNotFoundException("Tank", req.getTankId()));
        var uploader = resolveCurrentUser();
        IngestionJob.Technique technique = parseTechnique(req.getTechnique());

        String sha256 = null;
        String storagePath = null;
        try {
            Path dir = Paths.get(rawStoragePath, LocalDateTime.now().toLocalDate().toString());
            Files.createDirectories(dir);
            String uniqueName = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path dest = dir.resolve(uniqueName);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream in = new DigestInputStream(file.getInputStream(), digest)) {
                Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
            }
            sha256 = HexFormat.of().formatHex(digest.digest());
            storagePath = dest.toAbsolutePath().toString();
            log.info("Raw file stored at {} sha256={}", storagePath, sha256);
        } catch (Exception e) {
            log.error("Failed to store raw file: {}", e.getMessage());
            throw new BusinessException("Failed to store raw file: " + e.getMessage());
        }

        Inspection inspection = null;
        if (req.getInspectionId() != null) {
            inspection = inspectionRepository.findById(req.getInspectionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Inspection", req.getInspectionId()));
        }

        var job = IngestionJob.builder().tank(tank).inspection(inspection).technique(technique)
            .sourceFilename(file.getOriginalFilename()).fileSha256(sha256)
            .uploadedBy(uploader).totalRows(req.getTotalRows()).status(IngestionJob.Status.UPLOADED).build();
        var savedJob = jobRepository.save(job);

        var rawFile = RawFile.builder().job(savedJob).originalFilename(file.getOriginalFilename())
            .storagePath(storagePath).sha256Hex(sha256).fileSizeBytes(file.getSize())
            .contentType(file.getContentType()).build();
        rawFileRepository.save(rawFile);

        auditService.record("IngestionJob", savedJob.getId().toString(), AuditEvent.Action.CREATE, null, savedJob);
        return ingestionMapper.toResponse(savedJob);
    }

    public IngestionJobResponse mapColumns(Integer jobId, ColumnMappingRequest req) {
        var job = findAndTransition(jobId, IngestionJob.Status.MAPPING);
        var before = ingestionMapper.toResponse(job);
        req.getMappings().forEach(m -> {
            var mapping = IngestionColumnMapping.builder().job(job)
                .sourceColumn(m.getSourceColumn()).timsField(m.getTimsField()).required(m.isRequired()).build();
            mappingRepository.save(mapping);
        });
        var saved = jobRepository.save(job);
        auditService.record("IngestionJob", saved.getId().toString(), AuditEvent.Action.UPDATE, before, ingestionMapper.toResponse(saved));
        return ingestionMapper.toResponse(saved);
    }

    public ValidationResultResponse validate(Integer jobId) {

        IngestionJob job = jobRepository.findById(jobId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("IngestionJob", jobId));

        IngestionValidationPipeline.ValidationResult result = validationPipeline.validate(job);

        // ING-002: derive and populate the `status` field
        result.deriveStatus();

        return ValidationResultResponse.builder()
                .valid(result.valid)
                .blocked(result.blocked)
                .blockReason(result.blockReason)
                .warningCount(result.warningCount)
                .warningMessage(result.warningMessage)
                .duplicateCount(result.duplicateCount)
                .outOfRangeCount(result.outOfRangeCount)
                .status(result.status)
                .build();
    }

    public IngestionJobResponse commit(Integer jobId) {
        var job = findAndTransition(jobId, IngestionJob.Status.COMMITTED);
        var before = ingestionMapper.toResponse(job);
        job.setCommittedAt(LocalDateTime.now());
        var saved = jobRepository.save(job);

        // --- existing defect creation ---
        int defectsCreated = validationPipeline.createThresholdBreachDefects(job, job.getTank());
        if (defectsCreated > 0)
            log.info("AT-022: {} retirement-breach defects created for job {}", defectsCreated, jobId);

        if (job.getTechnique() == IngestionJob.Technique.MFL)
            mflClassificationService.classifyAndCreateDefects(job.getTank(), job);

        // ── NEW: CALC-001 / CALC-002 auto-trigger ─────────────────
        try {
            calculationService.recomputeForTank(job.getTank());
            log.info("CALC-001: Auto-recompute triggered for tank {} after commit of job {}",
                    job.getTank().getTankId(), jobId);
        } catch (Exception ex) {
            // Do not fail the commit if recompute fails — log and continue
            log.error("CALC recompute failed after commit of job {}: {}", jobId, ex.getMessage());
        }

        auditService.record("IngestionJob", saved.getId().toString(),
                AuditEvent.Action.COMMIT, before, ingestionMapper.toResponse(saved));

        return ingestionMapper.toResponse(saved);
    }

    private IngestionJob findJob(Integer jobId) {
        return jobRepository.findById(jobId).orElseThrow(() -> new ResourceNotFoundException("IngestionJob", jobId));
    }

    private IngestionJob findAndTransition(Integer jobId, IngestionJob.Status target) {
        var job = findJob(jobId);
        var allowed = TRANSITIONS.getOrDefault(job.getStatus(), Set.of());
        if (!allowed.contains(target)) throw new InvalidStateTransitionException(job.getStatus().name(), target.name());
        job.setStatus(target);
        return job;
    }

    private User resolveCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User: " + email));
    }

    private IngestionJob.Technique parseTechnique(String raw) {
        try { return IngestionJob.Technique.valueOf(raw.toUpperCase()); }
        catch (IllegalArgumentException e) { throw new BusinessException("Unknown technique: " + raw); }
    }
    /**
     * Upload entry-point that accepts the business tankId string
     * (e.g. "T-101") and an optional "inspectionType" alias for technique.
     *
     * Called from IngestionController.upload() which already resolves
     * the technique field alias.
     */
    public IngestionJobResponse uploadFlex(MultipartFile file,
                                           String businessTankId,
                                           String techniqueStr,
                                           Integer inspectionId) {
        log.info("Ingestion upload (flex): tankId={} technique={} file={}",
                businessTankId, techniqueStr, file.getOriginalFilename());

        // Resolve business ID → Tank entity
        Tank tank = tankRepository.findByTankId(businessTankId)
                .orElseThrow(() -> new ResourceNotFoundException("Tank", businessTankId));

        var uploader = resolveCurrentUser();
        IngestionJob.Technique technique = parseTechnique(techniqueStr);

        // --- file storage (same logic as existing upload()) ---
        String sha256 = null;
        String storagePath = null;
        try {
            Path dir = Paths.get(rawStoragePath, LocalDateTime.now().toLocalDate().toString());
            Files.createDirectories(dir);
            String uniqueName = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path dest = dir.resolve(uniqueName);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream in = new DigestInputStream(file.getInputStream(), digest)) {
                Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
            }
            sha256 = HexFormat.of().formatHex(digest.digest());
            storagePath = dest.toAbsolutePath().toString();
        } catch (Exception e) {
            log.error("Failed to store raw file: {}", e.getMessage());
            throw new BusinessException("Failed to store raw file: " + e.getMessage());
        }

        Inspection inspection = null;
        if (inspectionId != null) {
            inspection = inspectionRepository.findById(inspectionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Inspection", inspectionId));
        }

        var job = IngestionJob.builder()
                .tank(tank)
                .inspection(inspection)
                .technique(technique)
                .sourceFilename(file.getOriginalFilename())
                .fileSha256(sha256)
                .uploadedBy(uploader)
                .status(IngestionJob.Status.UPLOADED)
                .build();
        var saved = jobRepository.save(job);

        // Persist raw_files record
        var rawFile = com.tims.entity.RawFile.builder()
                .job(saved)
                .originalFilename(file.getOriginalFilename())
                .storagePath(storagePath)
                .sha256Hex(sha256)
                .fileSizeBytes(file.getSize())
                .contentType(file.getContentType())
                .build();
        rawFileRepository.save(rawFile);

        auditService.record("IngestionJob", saved.getId().toString(),
                AuditEvent.Action.CREATE, null, ingestionMapper.toResponse(saved));

        return ingestionMapper.toResponse(saved);
    }

    /**
     * Maps the current job status to a progress percentage and step label.
     */
    public IngestionStatusResponse getStatus(Integer jobId) {
        IngestionJob job = findJob(jobId);

        int progress;
        String step;

        switch (job.getStatus()) {
            case UPLOADED   -> { progress = 20; step = "AWAITING_MAPPING"; }
            case MAPPING    -> { progress = 40; step = "MAPPING"; }
            case VALIDATED  -> { progress = 70; step = "VALIDATED"; }
            case COMMITTED  -> { progress = 100; step = "DONE"; }
            case FAILED     -> { progress = 0;  step = "FAILED"; }
            default         -> { progress = 10; step = "UPLOADING"; }
        }

        // Collect warnings from below-retirement readings if job is validated/committed
        List<String> warnings = new java.util.ArrayList<>();
        if (job.getStatus() == IngestionJob.Status.VALIDATED
                || job.getStatus() == IngestionJob.Status.COMMITTED) {
            long belowCount = utReadingRepository.findByJobIdAndBelowRetirementTrue(jobId).size();
            if (belowCount > 0) {
                warnings.add(belowCount + " reading(s) below retirement threshold");
            }
            if (job.getDuplicateCount() != null && job.getDuplicateCount() > 0) {
                warnings.add(job.getDuplicateCount() + " duplicate reading(s) detected");
            }
        }

        return IngestionStatusResponse.builder()
                .jobId(jobId)
                .status(job.getStatus().name())
                .progress(progress)
                .step(step)
                .warnings(warnings)
                .errors(new java.util.ArrayList<>())
                .build();
    }

}

package com.tims.service;

import com.opencsv.CSVReader;
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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.file.*;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class IngestionJobService {

    private static final Map<IngestionJob.Status, Set<IngestionJob.Status>> TRANSITIONS = Map.of(
            IngestionJob.Status.UPLOADED,
            Set.of(IngestionJob.Status.MAPPING, IngestionJob.Status.FAILED),

            IngestionJob.Status.MAPPING,
            Set.of(IngestionJob.Status.VALIDATED, IngestionJob.Status.FAILED),

            IngestionJob.Status.VALIDATED,
            Set.of(IngestionJob.Status.COMMITTED, IngestionJob.Status.FAILED),

            IngestionJob.Status.COMMITTED,
            Set.of(),

            IngestionJob.Status.FAILED,
            Set.of()
    );

    @Value("${tims.ingestion.raw-storage-path:/data/tims/raw}")
    private String rawStoragePath;

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
    private final StagingUtReadingRepository stagingUtReadingRepository;

    // ============================================================
    // LIST
    // ============================================================

    @Transactional(readOnly = true)
    public Page<IngestionJobResponse> listJobs(Pageable pageable) {

        return jobRepository.findAll(pageable)
                .map(ingestionMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public IngestionJobResponse getJob(Integer jobId) {

        return ingestionMapper.toResponse(findJob(jobId));
    }

    // ============================================================
    // UPLOAD (Fixed for Retry Workflow)
    // ============================================================

    @Transactional
    public IngestionJobResponse upload(
            MultipartFile file,
            UploadIngestionRequest req,
            Integer jobId
    ) {

        log.info(
                "[UPLOAD] file={} tankId={} technique={} jobId={}",
                file.getOriginalFilename(),
                req.getTankId(),
                req.getTechnique(),
                jobId
        );

        FileStorageResult fs = storeFile(file);

        // ============================================================
        // IMPORTANT FIX: Prevent SQL Crash on Duplicate Files
        // ONLY check if this is a NEW job (not a retry)
        // ============================================================
        if (jobId == null) {
            rawFileRepository.findBySha256Hex(fs.sha256()).ifPresent(existingRaw -> {
                throw new BusinessException(
                        "Duplicate File: This exact file was already uploaded under Job #" +
                                existingRaw.getJob().getId() +
                                ". Please navigate to the Job Dashboard to resume or retry that job."
                );
            });
        }
        // ============================================================

        User uploader = resolveCurrentUser();
        IngestionJob job;

        if (jobId != null) {
            // 1. UPDATE EXISTING (The user clicked "Retry" and uploaded a corrected file)
            job = findJob(jobId);
            job.setSourceFilename(file.getOriginalFilename());
            job.setFileSha256(fs.sha256());
            job.setStatus(IngestionJob.Status.UPLOADED);
            job.setTotalRows(req.getTotalRows());

            // Clear out old staging errors since they uploaded a new file
            stagingUtReadingRepository.deleteByJobId(jobId);

            // Update RawFile reference
            rawFileRepository.findByJobId(jobId).ifPresent(raw -> {
                raw.setOriginalFilename(file.getOriginalFilename());
                raw.setStoragePath(fs.path());
                raw.setSha256Hex(fs.sha256());
                raw.setFileSizeBytes(file.getSize());
                rawFileRepository.save(raw);
            });

            audit("UPDATE", null, ingestionMapper.toResponse(job));

        } else {
            // 2. CREATE NEW
            Tank tank = tankRepository.findByTankId(req.getTankId())
                    .orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "Tank",
                                    req.getTankId()
                            )
                    );

            IngestionJob.Technique technique =
                    parseTechnique(req.getTechnique());

            Inspection inspection =
                    resolveInspection(req.getInspectionId());

            job = jobRepository.save(
                    IngestionJob.builder()
                            .tank(tank)
                            .inspection(inspection)
                            .technique(technique)
                            .sourceFilename(file.getOriginalFilename())
                            .fileSha256(fs.sha256())
                            .uploadedBy(uploader)
                            .totalRows(req.getTotalRows())
                            .status(IngestionJob.Status.UPLOADED)
                            .build()
            );

            rawFileRepository.save(
                    RawFile.builder()
                            .job(job)
                            .originalFilename(file.getOriginalFilename())
                            .storagePath(fs.path())
                            .sha256Hex(fs.sha256())
                            .fileSizeBytes(file.getSize())
                            .contentType(file.getContentType())
                            .build()
            );

            audit(
                    "CREATE",
                    null,
                    ingestionMapper.toResponse(job)
            );
        }

        return ingestionMapper.toResponse(jobRepository.save(job));
    }

    // ============================================================
    // FLEX UPLOAD
    // ============================================================

    @Transactional
    public IngestionJobResponse uploadFlex(
            MultipartFile file,
            String businessTankId,
            String techniqueStr,
            Integer inspectionId
    ) {

        Tank tank = tankRepository.findByTankId(businessTankId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Tank",
                                businessTankId
                        )
                );

        User uploader = resolveCurrentUser();

        IngestionJob.Technique technique =
                parseTechnique(techniqueStr);

        FileStorageResult fs = storeFile(file);

        Inspection inspection =
                resolveInspection(inspectionId);

        IngestionJob job = jobRepository.save(
                IngestionJob.builder()
                        .tank(tank)
                        .inspection(inspection)
                        .technique(technique)
                        .sourceFilename(file.getOriginalFilename())
                        .fileSha256(fs.sha256())
                        .uploadedBy(uploader)
                        .status(IngestionJob.Status.UPLOADED)
                        .build()
        );

        rawFileRepository.save(
                RawFile.builder()
                        .job(job)
                        .originalFilename(file.getOriginalFilename())
                        .storagePath(fs.path())
                        .sha256Hex(fs.sha256())
                        .fileSizeBytes(file.getSize())
                        .contentType(file.getContentType())
                        .build()
        );

        audit(
                "CREATE",
                null,
                ingestionMapper.toResponse(job)
        );

        return ingestionMapper.toResponse(job);
    }

    // ============================================================
    // COLUMN MAPPING
    // ============================================================

    @Transactional
    public IngestionJobResponse mapColumns(
            Integer jobId,
            ColumnMappingRequest req
    ) {

        log.info("[MAP][JOB:{}] started", jobId);

        IngestionJob job =
                transition(jobId, IngestionJob.Status.MAPPING);

        IngestionJobResponse before =
                ingestionMapper.toResponse(job);

        // IMPORTANT FIX
        // prevent duplicate mappings
        mappingRepository.deleteByJobId(jobId);

        List<IngestionColumnMapping> mappings =
                req.getMappings()
                        .stream()
                        .map(m ->
                                IngestionColumnMapping.builder()
                                        .job(job)
                                        .sourceColumn(m.getSourceColumn())
                                        .timsField(m.getTimsField())
                                        .required(m.isRequired())
                                        .build()
                        )
                        .toList();

        mappingRepository.saveAll(mappings);

        jobRepository.save(job);

        audit(
                "UPDATE",
                before,
                ingestionMapper.toResponse(job)
        );

        return ingestionMapper.toResponse(job);
    }

    // ============================================================
    // VALIDATE
    // CORRECT FLOW:
    // parse → validate
    // ============================================================

    @Transactional
    public ValidationResultResponse validate(Integer jobId) {

        log.info("[VALIDATE][JOB:{}] started", jobId);

        IngestionJob job = findJob(jobId);

        // STEP 1
        parseCsvToStaging(jobId);

        // STEP 2
        IngestionValidationPipeline.ValidationResult result =
                validationPipeline.validate(job);

        job.setStatus(result.status);

        jobRepository.save(job);

        log.info(
                "[VALIDATE][JOB:{}] completed valid={} blocked={}",
                jobId,
                result.valid,
                result.blocked
        );

        return ValidationResultResponse.builder()
                .valid(result.valid)
                .blocked(result.blocked)
                .blockReason(result.blockReason)
                .warningCount(result.warningCount)
                .warningMessage(result.warningMessage)
                .duplicateCount(result.duplicateCount)
                .outOfRangeCount(result.outOfRangeCount)
                .status(result.status.name())
                .build();
    }

    // ============================================================
    // CSV → STAGING
    // ============================================================

    @Transactional
    public void parseCsvToStaging(Integer jobId) {

        log.info("[STAGING][JOB:{}] started", jobId);

        IngestionJob job = findJob(jobId);

        stagingUtReadingRepository.deleteByJobId(jobId);

        RawFile raw = rawFileRepository.findAll()
                .stream()
                .filter(r -> r.getJob().getId().equals(jobId))
                .findFirst()
                .orElseThrow(() ->
                        new BusinessException(
                                "Raw file missing"
                        )
                );

        List<IngestionColumnMapping> mappings =
                mappingRepository.findByJobId(jobId);

        if (mappings.isEmpty()) {
            throw new BusinessException(
                    "Column mapping missing"
            );
        }

        try (

                InputStreamReader reader =
                        new InputStreamReader(
                                Files.newInputStream(
                                        Paths.get(raw.getStoragePath())
                                )
                        );

                CSVReader csv = new CSVReader(reader)

        ) {

            String[] header = csv.readNext();

            if (header == null) {
                throw new BusinessException(
                        "CSV header missing"
                );
            }

            List<String> headers =
                    Arrays.stream(header)
                            .map(h -> h.replace("\"", "").trim())
                            .toList();

            Map<String, Integer> indexMap =
                    new HashMap<>();

            for (IngestionColumnMapping m : mappings) {

                int idx =
                        headers.indexOf(m.getSourceColumn());

                if (idx >= 0) {
                    indexMap.put(
                            m.getTimsField(),
                            idx
                    );
                }
            }

            List<StagingUtReading> rows =
                    new ArrayList<>();

            String[] v;

            int rowNum = 1;

            while ((v = csv.readNext()) != null) {

                rowNum++;

                try {

                    String readingId =
                            get(v, indexMap, "reading_id");

                    BigDecimal thickness =
                            parseDecimal(
                                    get(v, indexMap, "thickness_mm")
                            );

                    BigDecimal nominal =
                            parseDecimal(
                                    get(v, indexMap, "nominal_mm")
                            );

                    boolean belowRetirement =
                            thickness != null &&
                                    thickness.doubleValue() < 3.0;

                    rows.add(
                            StagingUtReading.builder()
                                    .jobId(jobId)
                                    .tankId(job.getTank().getTankId())
                                    .readingId(
                                            readingId == null
                                                    ? "UNKNOWN"
                                                    : readingId
                                    )
                                    .thicknessMm(thickness)
                                    .nominalMm(nominal)
                                    .belowRetirement(belowRetirement)
                                    .build()
                    );

                } catch (Exception rowEx) {

                    log.warn(
                            "[STAGING][JOB:{}] failed row={} error={}",
                            jobId,
                            rowNum,
                            rowEx.getMessage()
                    );
                }
            }

            stagingUtReadingRepository.saveAll(rows);

            log.info(
                    "[STAGING][JOB:{}] rows inserted={}",
                    jobId,
                    rows.size()
            );

        } catch (Exception e) {

            log.error(
                    "[STAGING][JOB:{}] failed error={}",
                    jobId,
                    e.getMessage(),
                    e
            );

            throw new BusinessException(
                    "CSV parsing failed: " + e.getMessage()
            );
        }
    }

    // ============================================================
// COMMIT
// ============================================================

    @Transactional
    public IngestionJobResponse commit(Integer jobId) {

        log.info("[COMMIT][JOB:{}] started", jobId);

        IngestionJob job = findJob(jobId);

        // ============================================================
        // VALIDATION GATE
        // ============================================================

        if (job.getStatus() != IngestionJob.Status.VALIDATED) {

            throw new BusinessException(
                    "Commit blocked. Job must be VALIDATED first."
            );
        }

        // ============================================================
        // LOAD STAGING
        // ============================================================

        List<StagingUtReading> staging =
                stagingUtReadingRepository.findByJobId(jobId);

        log.info(
                "[COMMIT][JOB:{}] staging rows={}",
                jobId,
                staging.size()
        );

        if (staging.isEmpty()) {

            throw new BusinessException(
                    "No staging data found"
            );
        }

        // ============================================================
        // AUDIT SNAPSHOT
        // ============================================================

        IngestionJobResponse before =
                ingestionMapper.toResponse(job);

        // ============================================================
        // TRANSITION
        // ============================================================

        job = transition(
                jobId,
                IngestionJob.Status.COMMITTED
        );

        job.setCommittedAt(LocalDateTime.now());

        jobRepository.save(job);

        // ============================================================
        // IMPORTANT FIX
        // lambda-safe immutable reference
        // ============================================================

        final IngestionJob committedJob = job;

        // ============================================================
        // STAGING → PRODUCTION
        // ============================================================

        List<UtReading> production =
                staging.stream()
                        .map(s ->
                                UtReading.builder()

                                        // FK
                                        .job(committedJob)
                                        .tank(committedJob.getTank())

                                        // reading
                                        .readingId(s.getReadingId())
                                        .shellCourse(s.getShellCourse())
                                        .angleDeg(s.getAngleDeg())
                                        .heightMm(s.getHeightMm())

                                        // thickness
                                        .thicknessMm(s.getThicknessMm())
                                        .nominalMm(s.getNominalMm())

                                        // metadata
                                        .probe(s.getProbe())
                                        .tempC(s.getTempC())

                                        // validation
                                        .belowRetirement(
                                                s.isBelowRetirement()
                                        )

                                        // audit
                                        .measuredAt(s.getMeasuredAt())

                                        .build()
                        )
                        .toList();

        log.info(
                "[COMMIT][JOB:{}] production rows prepared={}",
                jobId,
                production.size()
        );

        // ============================================================
        // SAVE PRODUCTION
        // ============================================================

        utReadingRepository.saveAll(production);

        log.info(
                "[COMMIT][JOB:{}] production rows saved",
                jobId
        );

        // ============================================================
        // CREATE DEFECTS
        // IMPORTANT:
        // must happen BEFORE staging cleanup
        // ============================================================

        int defects =
                validationPipeline
                        .createThresholdBreachDefects(
                                committedJob,
                                committedJob.getTank()
                        );

        log.info(
                "[COMMIT][JOB:{}] defects created={}",
                jobId,
                defects
        );

        // ============================================================
        // CLEAN STAGING
        // ============================================================

        stagingUtReadingRepository.deleteByJobId(jobId);

        log.info(
                "[COMMIT][JOB:{}] staging cleared",
                jobId
        );

        // ============================================================
        // AUDIT
        // ============================================================

        audit(
                "COMMIT",
                before,
                Map.of(
                        "jobId", committedJob.getId(),
                        "tankId", committedJob.getTank().getTankId(),
                        "status", committedJob.getStatus(),
                        "committedAt", committedJob.getCommittedAt(),
                        "rowsCommitted", production.size(),
                        "defectsCreated", defects
                )
        );

        // ============================================================
        // POST COMMIT RECALCULATION
        // ============================================================

        TransactionSynchronizationManager
                .registerSynchronization(
                        new TransactionSynchronization() {

                            @Override
                            public void afterCommit() {

                                try {

                                    log.info(
                                            "[COMMIT][JOB:{}] recalculation started",
                                            jobId
                                    );

                                    calculationService
                                            .recomputeForTank(
                                                    committedJob.getTank()
                                            );

                                    log.info(
                                            "[COMMIT][JOB:{}] recalculation completed",
                                            jobId
                                    );

                                } catch (Exception e) {

                                    log.error(
                                            "[COMMIT][JOB:{}] recalculation failed {}",
                                            jobId,
                                            e.getMessage(),
                                            e
                                    );
                                }
                            }
                        }
                );

        log.info(
                "[COMMIT][JOB:{}] completed successfully",
                jobId
        );

        return ingestionMapper.toResponse(committedJob);
    }

    // ============================================================
    // STATUS
    // ============================================================

    @Transactional(readOnly = true)
    public IngestionStatusResponse getStatus(Integer jobId) {

        IngestionJob job = findJob(jobId);

        return IngestionStatusResponse.builder()
                .jobId(jobId)
                .status(job.getStatus().name())
                .progress(mapProgress(job.getStatus()))
                .step(job.getStatus().name())
                .warnings(new ArrayList<>())
                .errors(new ArrayList<>())
                .build();
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private IngestionJob findJob(Integer id) {

        return jobRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Job",
                                id
                        )
                );
    }

    private IngestionJob transition(
            Integer id,
            IngestionJob.Status target
    ) {

        IngestionJob job = findJob(id);

        if (!TRANSITIONS
                .getOrDefault(job.getStatus(), Set.of())
                .contains(target)) {

            throw new InvalidStateTransitionException(
                    job.getStatus().name(),
                    target.name()
            );
        }

        job.setStatus(target);

        return job;
    }

    private User resolveCurrentUser() {

        String email =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
                        .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User",
                                email
                        )
                );
    }

    private IngestionJob.Technique parseTechnique(
            String raw
    ) {

        return IngestionJob.Technique.valueOf(
                raw.toUpperCase()
        );
    }

    private Inspection resolveInspection(Integer id) {

        if (id == null) {
            return null;
        }

        return inspectionRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Inspection",
                                id
                        )
                );
    }

    private int mapProgress(IngestionJob.Status status) {

        return switch (status) {

            case UPLOADED -> 20;

            case MAPPING -> 40;

            case VALIDATED -> 70;

            case COMMITTED -> 100;

            case FAILED -> 0;
        };
    }

    private String get(
            String[] v,
            Map<String, Integer> map,
            String key
    ) {

        Integer i = map.get(key);

        if (i == null || i >= v.length) {
            return null;
        }

        return v[i] == null
                ? null
                : v[i].trim();
    }

    // IMPORTANT FIX
    // safe decimal parser
    private BigDecimal parseDecimal(String v) {

        try {

            if (v == null || v.isBlank()) {
                return null;
            }

            return new BigDecimal(v.trim());

        } catch (Exception e) {

            log.warn(
                    "[CSV] invalid decimal value={}",
                    v
            );

            return null;
        }
    }

    private FileStorageResult storeFile(
            MultipartFile file
    ) {

        try {

            Path dir = Paths.get(
                    rawStoragePath,
                    LocalDateTime.now()
                            .toLocalDate()
                            .toString()
            );

            Files.createDirectories(dir);

            String name =
                    UUID.randomUUID()
                            + "_"
                            + file.getOriginalFilename();

            Path dest = dir.resolve(name);

            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            try (
                    InputStream in =
                            new DigestInputStream(
                                    file.getInputStream(),
                                    digest
                            )
            ) {

                Files.copy(
                        in,
                        dest,
                        StandardCopyOption.REPLACE_EXISTING
                );
            }

            return new FileStorageResult(
                    dest.toString(),
                    HexFormat.of()
                            .formatHex(digest.digest())
            );

        } catch (Exception e) {

            throw new BusinessException(
                    "File store failed: " + e.getMessage()
            );
        }
    }

    private void audit(
            String action,
            Object before,
            Object after
    ) {

        auditService.record(
                "IngestionJob",
                "N/A",
                AuditEvent.Action.valueOf(action),
                before,
                after
        );
    }

    private record FileStorageResult(
            String path,
            String sha256
    ) {
    }
}
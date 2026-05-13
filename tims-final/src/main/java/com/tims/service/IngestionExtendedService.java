package com.tims.service;


import com.tims.audit.AuditEvent;
import com.tims.audit.AuditEventRepository;
import com.tims.dto.response.IngestionErrorResponse;
import com.tims.dto.response.IngestionJobResponse;
import com.tims.dto.response.IngestionPreviewResponse;
import com.tims.exception.ResourceNotFoundException;
import com.tims.mapper.IngestionMapper;
import com.tims.repository.IngestionJobRepository;
import com.tims.repository.RawFileRepository;
import com.tims.repository.UtReadingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IngestionExtendedService {

    private final IngestionJobRepository  jobRepository;
    private final RawFileRepository       rawFileRepository;
    private final UtReadingRepository     utReadingRepository;
    private final AuditEventRepository    auditEventRepository;
    private final IngestionMapper         ingestionMapper;
    private final IngestionJobService     ingestionJobService;

    /**
     * Returns status of a job — thin wrapper over existing getJob().
     */
    public Map<String, Object> getJobStatus(Integer jobId) {
        var job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("IngestionJob", jobId));

        return Map.of(
                "jobId",         job.getId(),
                "status",        job.getStatus().name(),
                "technique",     job.getTechnique().name(),
                "uploadDate",    job.getUploadDate().toString(),
                "totalRows",     job.getTotalRows() != null ? job.getTotalRows() : 0,
                "duplicateCount",job.getDuplicateCount(),
                "outOfRangeCount",job.getOutOfRangeCount(),
                "committedAt",   job.getCommittedAt() != null ? job.getCommittedAt().toString() : null
        );
    }

    /**
     * Returns validation errors for a job (duplicates + out-of-range readings).
     */
    public IngestionErrorResponse getJobErrors(Integer jobId) {
        var job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("IngestionJob", jobId));

        List<String> errorDetails = new ArrayList<>();

        // Duplicate readings
        long duplicates = utReadingRepository.countDuplicateReadingsByJobId(jobId);
        if (duplicates > 0)
            errorDetails.add(duplicates + " duplicate readings detected (same shell_course + angle_deg)");

        // Below-retirement readings
        var belowRetirement = utReadingRepository.findByJobIdAndBelowRetirementTrue(jobId);
        if (!belowRetirement.isEmpty())
            errorDetails.add(belowRetirement.size() + " readings are below retirement thickness threshold");

        return IngestionErrorResponse.builder()
                .jobId(jobId)
                .totalErrors(errorDetails.size())
                .duplicateCount((int) duplicates)
                .outOfRangeCount(belowRetirement.size())
                .errorDetails(errorDetails)
                .build();
    }

    /**
     * Returns a preview of the ingestion job: column names and first 10 rows of UT readings.
     */
    public IngestionPreviewResponse getJobPreview(Integer jobId) {
        var job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("IngestionJob", jobId));

        // Return actual UT readings as preview rows (first 10)
        var readings = utReadingRepository.findByJobId(jobId);
        var sampleRows = readings.stream().limit(10).map(r -> {
            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("readingId",      r.getReadingId());
            row.put("shellCourse",    r.getShellCourse());
            row.put("angleDeg",       r.getAngleDeg());
            row.put("heightMm",       r.getHeightMm());
            row.put("thicknessMm",    r.getThicknessMm());
            row.put("nominalMm",      r.getNominalMm());
            row.put("belowRetirement",r.isBelowRetirement());
            return row;
        }).collect(Collectors.toList());

        return IngestionPreviewResponse.builder()
                .jobId(jobId)
                .sourceFilename(job.getSourceFilename())
                .totalRows(job.getTotalRows())
                .columnNames(List.of("readingId","shellCourse","angleDeg","heightMm",
                        "thicknessMm","nominalMm","belowRetirement"))
                .sampleRows(sampleRows)
                .build();
    }

    /**
     * Returns audit events for a specific ingestion job.
     */
    public List<AuditEvent> getJobAudit(Integer jobId) {
        if (!jobRepository.existsById(jobId))
            throw new ResourceNotFoundException("IngestionJob", jobId);

        return auditEventRepository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(
                "IngestionJob", jobId.toString());
    }

    /**
     * Retry a FAILED job — transitions back to UPLOADED so the workflow can restart.
     */
    @Transactional
    public IngestionJobResponse retryJob(Integer jobId) {
        var job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("IngestionJob", jobId));

        if (job.getStatus() != com.tims.entity.IngestionJob.Status.FAILED)
            throw new com.tims.exception.BusinessException(
                    "Only FAILED jobs can be retried. Current status: " + job.getStatus());

        job.setStatus(com.tims.entity.IngestionJob.Status.UPLOADED);
        var saved = jobRepository.save(job);
        log.info("Job {} reset to UPLOADED for retry", jobId);

        return ingestionMapper.toResponse(saved);
    }
}
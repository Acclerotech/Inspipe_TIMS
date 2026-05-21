package com.tims.service;


import com.tims.audit.AuditEvent;
import com.tims.audit.AuditEventRepository;
import com.tims.dto.response.IngestionErrorResponse;
import com.tims.dto.response.IngestionJobResponse;
import com.tims.dto.response.IngestionPreviewResponse;
import com.tims.entity.RawFile;
import com.tims.exception.ResourceNotFoundException;
import com.tims.mapper.IngestionMapper;
import com.tims.repository.IngestionJobRepository;
import com.tims.repository.RawFileRepository;
import com.tims.repository.StagingUtReadingRepository;
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
    private final StagingUtReadingRepository stagingUtReadingRepository;

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

    public IngestionPreviewResponse getJobPreview(Integer jobId) {
        log.info("[PREVIEW] Fetching CSV preview for Job ID: {}", jobId);

        var job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("IngestionJob", jobId));

        // 1. Find the physical file location stored during the initial upload
        RawFile raw = rawFileRepository.findByJobId(jobId)
                .orElseThrow(() -> new com.tims.exception.BusinessException("Raw file missing for job " + jobId));

        List<String> headers = new ArrayList<>();
        List<Map<String, Object>> previewRows = new ArrayList<>();

        // 2. Open and read the raw CSV file
        try (
                java.io.InputStreamReader reader = new java.io.InputStreamReader(java.nio.file.Files.newInputStream(java.nio.file.Paths.get(raw.getStoragePath())));
                com.opencsv.CSVReader csv = new com.opencsv.CSVReader(reader)
        ) {
            String[] headerRow = csv.readNext();
            if (headerRow == null) {
                throw new com.tims.exception.BusinessException("CSV file is empty");
            }

            // Clean quotes from headers
            for (String h : headerRow) {
                headers.add(h.replace("\"", "").trim());
            }

            // Read the first 5 rows for the preview UI
            String[] row;
            int count = 0;
            while ((row = csv.readNext()) != null && count < 5) {
                Map<String, Object> rowData = new java.util.LinkedHashMap<>();
                for (int i = 0; i < headers.size(); i++) {
                    String val = (i < row.length && row[i] != null) ? row[i].trim() : "";
                    rowData.put(headers.get(i), val);
                }
                previewRows.add(rowData);
                count++;
            }

        } catch (Exception e) {
            log.error("[PREVIEW][JOB:{}] Failed to read CSV: {}", jobId, e.getMessage(), e);
            throw new com.tims.exception.BusinessException("Failed to parse stored CSV file: " + e.getMessage());
        }

        // 3. Return the parsed CSV headers and rows
        return IngestionPreviewResponse.builder()
                .jobId(jobId)
                .sourceFilename(job.getSourceFilename())
                .totalRows(job.getTotalRows())
                .columnNames(headers)
                .sampleRows(previewRows)
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
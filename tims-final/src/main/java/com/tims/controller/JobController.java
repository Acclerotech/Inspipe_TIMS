package com.tims.controller;

import com.tims.audit.AuditEvent;
import com.tims.dto.response.IngestionErrorResponse;
import com.tims.dto.response.IngestionJobResponse;
import com.tims.dto.response.IngestionPreviewResponse;
import com.tims.service.IngestionExtendedService;
import com.tims.service.IngestionJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * New JobController — exposes ingestion jobs under /api/jobs path.
 * The /api/ingestion path is preserved for the wizard workflow (upload/map/validate/commit).
 * This controller covers monitoring and management endpoints.
 *
 * GET  /jobs                  → USE EXISTING (delegates to ingestionJobService.listJobs)
 * GET  /jobs/{id}             → USE EXISTING
 * GET  /jobs/{id}/status      → EXTEND
 * POST /jobs/retry/{id}       → CREATE NEW
 *
 * GET  /ingestion/jobs        → USE EXISTING (same as GET /ingestion)
 * GET  /ingestion/jobs/{id}   → USE EXISTING (same as GET /ingestion/{id})
 * GET  /ingestion/jobs/{id}/status  → EXTEND
 * GET  /ingestion/jobs/{id}/errors  → CREATE NEW
 * GET  /ingestion/jobs/{id}/preview → CREATE NEW
 * GET  /ingestion/jobs/{id}/audit   → EXTEND
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Jobs / Ingestion Management")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_ENGINEER')")
public class JobController {

    private final IngestionJobService         ingestionJobService;
    private final IngestionExtendedService    ingestionExtendedService;

    // ── /api/jobs — USE EXISTING (delegates) ─────────────────────────────────

    @GetMapping("/api/jobs")
    @Operation(summary = "List all ingestion jobs — USE EXISTING (delegates to /ingestion)")
    public ResponseEntity<Page<IngestionJobResponse>> listJobs(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ingestionJobService.listJobs(pageable));
    }

    @GetMapping("/api/jobs/{id}")
    @Operation(summary = "Get job by ID — USE EXISTING (delegates to /ingestion/{id})")
    public ResponseEntity<IngestionJobResponse> getJob(@PathVariable Integer id) {
        return ResponseEntity.ok(ingestionJobService.getJob(id));
    }

    @GetMapping("/api/jobs/{id}/status")
    @Operation(summary = "Get job status summary — EXTEND")
    public ResponseEntity<Map<String, Object>> getJobStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(ingestionExtendedService.getJobStatus(id));
    }

    @PostMapping("/api/jobs/retry/{id}")
    @Operation(summary = "Retry a FAILED job — resets status to UPLOADED",
               description = "Only FAILED jobs can be retried. " +
                             "Resets to UPLOADED so the wizard workflow can restart.")
    public ResponseEntity<IngestionJobResponse> retryJob(@PathVariable Integer id) {
        return ResponseEntity.ok(ingestionExtendedService.retryJob(id));
    }

    // ── /api/ingestion/jobs — USE EXISTING ────────────────────────────────────

    @GetMapping("/api/ingestion/jobs")
    @Operation(summary = "List ingestion jobs — USE EXISTING (same as GET /ingestion)")
    public ResponseEntity<Page<IngestionJobResponse>> listIngestionJobs(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ingestionJobService.listJobs(pageable));
    }

    @GetMapping("/api/ingestion/jobs/{id}")
    @Operation(summary = "Get ingestion job — USE EXISTING (same as GET /ingestion/{id})")
    public ResponseEntity<IngestionJobResponse> getIngestionJob(@PathVariable Integer id) {
        return ResponseEntity.ok(ingestionJobService.getJob(id));
    }

    @GetMapping("/api/ingestion/jobs/{id}/status")
    @Operation(summary = "Ingestion job status summary — EXTEND")
    public ResponseEntity<Map<String, Object>> getIngestionJobStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(ingestionExtendedService.getJobStatus(id));
    }

    @GetMapping("/api/ingestion/jobs/{id}/errors")
    @Operation(summary = "Ingestion job errors — duplicate and out-of-range readings — CREATE NEW")
    public ResponseEntity<IngestionErrorResponse> getJobErrors(@PathVariable Integer id) {
        return ResponseEntity.ok(ingestionExtendedService.getJobErrors(id));
    }

    @GetMapping("/api/ingestion/jobs/{id}/preview")
    @Operation(summary = "Preview first 10 rows of ingestion job data — CREATE NEW",
               description = "Returns column names and sample rows from committed UT readings.")
    public ResponseEntity<IngestionPreviewResponse> getJobPreview(@PathVariable Integer id) {
        return ResponseEntity.ok(ingestionExtendedService.getJobPreview(id));
    }

    @GetMapping("/api/ingestion/jobs/{id}/audit")
    @Operation(summary = "Full audit trail for an ingestion job — EXTEND",
               description = "Returns all audit events for this job from the audit_events table.")
    public ResponseEntity<List<AuditEvent>> getJobAudit(@PathVariable Integer id) {
        return ResponseEntity.ok(ingestionExtendedService.getJobAudit(id));
    }
}

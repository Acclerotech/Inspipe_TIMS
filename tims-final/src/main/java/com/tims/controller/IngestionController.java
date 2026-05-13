package com.tims.controller;
import com.tims.dto.request.ColumnMappingRequest;
import com.tims.dto.request.UploadIngestionRequest;
import com.tims.dto.response.IngestionJobResponse;
import com.tims.dto.response.ValidationResultResponse;
import com.tims.service.IngestionJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
@RestController @RequestMapping("/api/ingestion") @RequiredArgsConstructor
@Tag(name="Data Ingestion") @SecurityRequirement(name="bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_ENGINEER')")
public class IngestionController {
    private final IngestionJobService ingestionJobService;
    @GetMapping @Operation(summary="List ingestion jobs")
    public ResponseEntity<Page<IngestionJobResponse>> listJobs(@PageableDefault(size=20) Pageable pageable) {
        return ResponseEntity.ok(ingestionJobService.listJobs(pageable));
    }
    @GetMapping("/{jobId}") @Operation(summary="Get ingestion job by ID")
    public ResponseEntity<IngestionJobResponse> getJob(@PathVariable Integer jobId) {
        return ResponseEntity.ok(ingestionJobService.getJob(jobId));
    }
    @PostMapping(value="/upload", consumes="multipart/form-data")
    @Operation(summary="Step 1: Upload file -> status UPLOADED")
    public ResponseEntity<IngestionJobResponse> upload(
            @RequestPart("file") MultipartFile file,
            @RequestPart("metadata") @Valid UploadIngestionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ingestionJobService.upload(file, req));
    }
    @PostMapping("/{jobId}/map-columns") @Operation(summary="Step 2: Map columns -> status MAPPING")
    public ResponseEntity<IngestionJobResponse> mapColumns(@PathVariable Integer jobId,
            @Valid @RequestBody ColumnMappingRequest req) {
        return ResponseEntity.ok(ingestionJobService.mapColumns(jobId, req));
    }
    @PostMapping("/{jobId}/validate") @Operation(summary="Step 3: Validate -> status VALIDATED")
    public ResponseEntity<ValidationResultResponse> validate(@PathVariable Integer jobId) {
        return ResponseEntity.ok(ingestionJobService.validate(jobId));
    }
    @PostMapping("/{jobId}/commit") @Operation(summary="Step 4: Commit -> status COMMITTED")
    public ResponseEntity<IngestionJobResponse> commit(@PathVariable Integer jobId) {
        return ResponseEntity.ok(ingestionJobService.commit(jobId));
    }
}

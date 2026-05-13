package com.tims.controller;
import com.tims.dto.request.CreateReportRequest;
import com.tims.dto.response.ComplianceReportResponse;
import com.tims.dto.response.ProvenanceResponse;
import com.tims.exception.ResourceNotFoundException;
import com.tims.report.ComplianceZipService;
import com.tims.report.PdfReportService;
import com.tims.repository.ComplianceReportRepository;
import com.tims.repository.IngestionJobRepository;
import com.tims.repository.RawFileRepository;
import com.tims.service.ComplianceReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController @RequestMapping("/api/reports") @RequiredArgsConstructor
@Tag(name="Compliance Reports") @SecurityRequirement(name="bearerAuth")
public class ComplianceReportController {
    private final ComplianceReportService    reportService;
    private final PdfReportService           pdfReportService;
    private final ComplianceZipService       complianceZipService;
    private final ComplianceReportRepository reportRepository;
    private final IngestionJobRepository jobRepository;
    private final RawFileRepository rawFileRepository;

    private static final String CALC_VERSION = "TIMS-CALC-v1.0";


    @GetMapping @Operation(summary="List reports")
    public ResponseEntity<Page<ComplianceReportResponse>> listReports(
            @RequestParam(required=false) String tankId, @PageableDefault(size=20) Pageable pageable) {
        return ResponseEntity.ok(reportService.listReports(tankId, pageable));
    }
    @GetMapping("/{id}") @Operation(summary="Get report by ID")
    public ResponseEntity<ComplianceReportResponse> getReport(@PathVariable Integer id) {
        return ResponseEntity.ok(reportService.getReport(id));
    }
    @PostMapping @Operation(summary="Create report (DRAFT)")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER','INTEGRITY_ENGINEER')")
    public ResponseEntity<ComplianceReportResponse> createReport(@Valid @RequestBody CreateReportRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reportService.createReport(req));
    }
    @PostMapping("/{id}/sign") @Operation(summary="Sign report")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER')")
    public ResponseEntity<ComplianceReportResponse> signReport(@PathVariable Integer id) {
        return ResponseEntity.ok(reportService.signReport(id));
    }
    @GetMapping("/{id}/pdf")
    @Operation(summary = "Download PDF (<=8s) with provenance appendix")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Integer id) {

        byte[] pdf = pdfReportService.generatePdf(id);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"report_" + id + ".pdf\""
                )
                .contentLength(pdf.length)
                .body(pdf);
    }
    @GetMapping("/{id}/compliance-pack")
    @Operation(summary = "Export compliance ZIP with manifest.json")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER')")
    public ResponseEntity<byte[]> downloadCompliancePack(@PathVariable Integer id) {

        byte[] zip = complianceZipService.buildCompliancePack(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"compliance_pack_" + id + ".zip\""
                )
                .contentLength(zip.length)
                .body(zip);
    }

    // ── NEW: GET /reports/{id}/preview ────────────────────────────────────────
    // Status: EXTEND EXISTING — returns same ComplianceReportResponse (no PDF generation)

    @GetMapping("/{id}/preview")
    @Operation(summary = "Lightweight report preview — JSON summary without generating PDF",
            description = "Returns the same data as GET /reports/{id} but explicitly " +
                    "signals frontend that this is a preview (no PDF cost).")
    public ResponseEntity<ComplianceReportResponse> previewReport(@PathVariable Integer id) {
        // Same as getReport — just a named alias the frontend uses before generating PDF
        return ResponseEntity.ok(reportService.getReport(id));
    }

    // ── NEW: GET /reports/{id}/provenance ─────────────────────────────────────
    // Status: CREATE NEW — returns provenance data as JSON (reuses existing raw_files + signatories)

    @GetMapping("/{id}/provenance")
    @Operation(summary = "Provenance appendix as JSON — data hashes, calc version, signatories",
            description = "Returns the same data embedded in the PDF provenance appendix " +
                    "but as structured JSON for frontend display.")
    public ResponseEntity<ProvenanceResponse> getProvenance(@PathVariable Integer id) {
        var report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceReport", id));

        var dataFiles = jobRepository
                .findByTankId(report.getTank().getId(),
                        org.springframework.data.domain.Pageable.unpaged())
                .getContent()
                .stream()
                .flatMap(job -> rawFileRepository.findByJobId(job.getId()).stream()
                        .map(raw -> ProvenanceResponse.DataFileEntry.builder()
                                .filename(raw.getOriginalFilename())
                                .sha256(raw.getSha256Hex())
                                .technique(job.getTechnique().name())
                                .uploadedAt(raw.getUploadedAt())
                                .build()))
                .toList();

        var signatories = report.getSignatories().stream()
                .map(s -> ProvenanceResponse.SignatoryEntry.builder()
                        .name(s.getUser().getFullName())
                        .role(s.getRole().name())
                        .signedAt(s.getSignedAt())
                        .build())
                .toList();

        return ResponseEntity.ok(ProvenanceResponse.builder()
                .reportId(id)
                .reportRef(report.getReportRef())
                .calcVersion(CALC_VERSION)
                .dataFiles(dataFiles)
                .signatories(signatories)
                .build());
    }

    // ── NEW: GET /reports/{id}/manifest ──────────────────────────────────────
    // Status: CREATE NEW — returns manifest.json content as JSON (no ZIP cost)

    @GetMapping("/{id}/manifest")
    @Operation(summary = "Compliance pack manifest as JSON — without generating the full ZIP",
            description = "Returns the same manifest.json that would be in the compliance-pack ZIP " +
                    "but as a direct JSON response.")
    public ResponseEntity<Map<String, Object>> getManifest(@PathVariable Integer id) {
        var report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceReport", id));

        var sourceDatasets = jobRepository
                .findByTankId(report.getTank().getId(),
                        org.springframework.data.domain.Pageable.unpaged())
                .getContent()
                .stream()
                .flatMap(job -> rawFileRepository.findByJobId(job.getId()).stream()
                        .map(raw -> Map.<String, Object>of(
                                "filename",   raw.getOriginalFilename(),
                                "sha256",     raw.getSha256Hex(),
                                "jobId",      job.getId(),
                                "technique",  job.getTechnique().name(),
                                "uploadedAt", raw.getUploadedAt().toString()
                        )))
                .toList();

        var signatories = report.getSignatories().stream()
                .map(s -> Map.<String, Object>of(
                        "name",     s.getUser().getFullName(),
                        "role",     s.getRole().name(),
                        "signedAt", s.getSignedAt() != null ? s.getSignedAt().toString() : "PENDING"
                )).toList();

        var manifest = new LinkedHashMap<String, Object>();
        manifest.put("schemaVersion",   "1.0");
        manifest.put("tankId",         report.getTank().getTankId());
        manifest.put("reportRef",        report.getReportRef());
        manifest.put("reportStatus",     report.getStatus().name());
        manifest.put("standardCode",     report.getStandard().getCode());
        manifest.put("inspectionDate",   report.getInspectionDate().toString());
        manifest.put("calcVersion",      CALC_VERSION);
        manifest.put("sourceDatasets",  sourceDatasets);
        manifest.put("signatories",     signatories);

        return ResponseEntity.ok(manifest);
    }
}

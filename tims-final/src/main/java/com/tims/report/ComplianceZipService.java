package com.tims.report;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tims.audit.AuditEventRepository;
import com.tims.exception.BusinessException;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.ComplianceReportRepository;
import com.tims.repository.IngestionJobRepository;
import com.tims.repository.RawFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ComplianceZipService {

    private final ComplianceReportRepository reportRepository;
    private final IngestionJobRepository jobRepository;
    private final RawFileRepository rawFileRepository;
    private final AuditEventRepository auditRepository;
    private final PdfReportService pdfReportService;
    private final ObjectMapper objectMapper;

    public byte[] buildCompliancePack(Integer reportId) {
        log.info("Building compliance pack for report {}", reportId);
        var report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceReport", reportId));
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(baos)) {
                byte[] pdfBytes = pdfReportService.generatePdf(reportId);
                addEntry(zip, "report_" + report.getReportRef() + ".pdf", pdfBytes);

                List<Map<String, Object>> sourceFiles = new ArrayList<>();
                var jobs = jobRepository.findByTankId(report.getTank().getId(), Pageable.unpaged()).getContent();
                for (var job : jobs) {
                    rawFileRepository.findByJobId(job.getId()).ifPresent(raw -> {
                        byte[] stub = (
                                "# " + raw.getOriginalFilename() + "\n" +
                                        "# SHA-256: " + raw.getSha256Hex()
                        ).getBytes();
                        try { addEntry(zip, "source_data/" + raw.getOriginalFilename(), stub); } catch (IOException ignored) {}
                        sourceFiles.add(Map.of("filename", raw.getOriginalFilename(), "sha256", raw.getSha256Hex(),
                            "jobId", job.getId(), "technique", job.getTechnique().name()));
                    });
                }

                var auditEvents = auditRepository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(
                        "Tank", report.getTank().getId().toString());
                byte[] auditJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(auditEvents);
                addEntry(zip, "audit_log_" + report.getTank().getTankId() + ".json", auditJson);

                var manifest = buildManifest(report, pdfBytes, sourceFiles);
                addEntry(zip, "manifest.json", objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(manifest));
            }
            log.info("Compliance pack built for report {}: {} bytes", reportId, baos.size());
            return baos.toByteArray();
        } catch (IOException e) {
            throw new BusinessException("Failed to build compliance pack: " + e.getMessage());
        }
    }

    private Map<String, Object> buildManifest(com.tims.entity.ComplianceReport report, byte[] pdfBytes, List<Map<String, Object>> sourceFiles) {
        var m = new LinkedHashMap<String, Object>();
        m.put("schemaVersion", "1.0");
        m.put("generatedAt", LocalDateTime.now().toString());
        m.put("tankCode", report.getTank().getTankId());
        m.put("reportRef", report.getReportRef());
        m.put("reportStatus", report.getStatus().name());
        m.put("standardCode", report.getStandard().getCode());
        m.put("inspectionDate", report.getInspectionDate().toString());
        m.put("pdfFilename", "report_" + report.getReportRef() + ".pdf");
        m.put("pdfSha256", sha256Hex(pdfBytes));
        m.put("sourceDatasets", sourceFiles);
        m.put("signatories", report.getSignatories().stream().map(s -> Map.of(
            "name", s.getUser().getFullName(), "role", s.getRole().name(),
            "signedAt", s.getSignedAt() != null ? s.getSignedAt().toString() : "PENDING")).toList());
        return m;
    }

    private void addEntry(ZipOutputStream zip, String name, byte[] data) throws IOException {
        zip.putNextEntry(new ZipEntry(name)); zip.write(data); zip.closeEntry();
    }
    private String sha256Hex(byte[] bytes) {
        try { return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (Exception e) { return "hash_error"; }
    }
}

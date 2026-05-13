package com.tims.report;

import com.tims.entity.ComplianceReport;
import com.tims.entity.IngestionJob;
import com.tims.exception.BusinessException;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.ComplianceReportRepository;
import com.tims.repository.IngestionJobRepository;
import com.tims.repository.RawFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PdfReportService {

    private static final String CALC_VERSION = "TIMS-CALC-v1.0";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final ComplianceReportRepository reportRepository;
    private final IngestionJobRepository jobRepository;
    private final RawFileRepository rawFileRepository;

    public byte[] generatePdf(Integer reportId) {
        long start = System.currentTimeMillis();
        log.info("Generating PDF for report {}", reportId);
        var report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceReport", reportId));
        try (PDDocument doc = new PDDocument()) {
            addCoverPage(doc, report);
            addSummaryPage(doc, report);
            addProvenancePage(doc, report);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            long elapsed = System.currentTimeMillis() - start;
            log.info("PDF for report {} generated in {}ms ({} pages)", reportId, elapsed, doc.getNumberOfPages());
            if (elapsed > 8000) log.warn("PDF SLA breach: {}ms for report {}", elapsed, reportId);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("PDF generation failed for report {}: {}", reportId, e.getMessage(), e);
            throw new BusinessException("PDF generation failed: " + e.getMessage());
        }
    }

    private void addCoverPage(PDDocument doc, ComplianceReport report) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            var bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            var regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            cs.beginText();
            cs.setFont(bold, 18); cs.newLineAtOffset(50, 780); cs.showText("TANK INTEGRITY MANAGEMENT SYSTEM");
            cs.setFont(bold, 14); cs.newLineAtOffset(0, -30); cs.showText("Well Site Examination Report");
            cs.setFont(regular, 11);
            cs.newLineAtOffset(0, -40); cs.showText("Report Ref:  " + report.getReportRef());
            cs.newLineAtOffset(0, -18); cs.showText("Tank:        " + report.getTank().getTankId());
            cs.newLineAtOffset(0, -18); cs.showText("Standard:    " + report.getStandard().getCode() + " " + report.getStandard().getEdition());
            cs.newLineAtOffset(0, -18); cs.showText("Inspection:  " + report.getInspectionDate());
            cs.newLineAtOffset(0, -18); cs.showText("Status:      " + report.getStatus().name());
            cs.newLineAtOffset(0, -18); cs.showText("Generated:   " + report.getGeneratedAt().format(FMT));
            cs.newLineAtOffset(0, -18); cs.showText("Author:      " + report.getGeneratedBy().getFullName());
            cs.endText();
        }
    }

    private void addSummaryPage(PDDocument doc, ComplianceReport report) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            var bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            var regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            cs.beginText();
            cs.setFont(bold, 13); cs.newLineAtOffset(50, 780); cs.showText("1. Inspection Summary");
            cs.setFont(regular, 10); cs.newLineAtOffset(0, -25); cs.showText("Sections included in this report:");
            for (var section : report.getSections()) {
                if (section.isIncluded()) { cs.newLineAtOffset(0, -16); cs.showText("  - " + section.getSectionName()); }
            }
            cs.endText();
        }
    }

    private void addProvenancePage(PDDocument doc, ComplianceReport report) throws Exception {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            var bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            var regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            var mono = new PDType1Font(Standard14Fonts.FontName.COURIER);
            cs.beginText();
            cs.setFont(bold, 13); cs.newLineAtOffset(50, 780); cs.showText("PROVENANCE APPENDIX");
            cs.setFont(regular, 10); cs.newLineAtOffset(0, -25); cs.showText("Calculation Engine Version: " + CALC_VERSION);
            cs.setFont(bold, 10); cs.newLineAtOffset(0, -25); cs.showText("Source Data File Hashes (SHA-256):");
            List<IngestionJob> jobs = jobRepository.findByTankId(report.getTank().getId(), Pageable.unpaged()).getContent();
            for (IngestionJob job : jobs) {
                rawFileRepository.findByJobId(job.getId()).ifPresent(raw -> {
                    try {
                        cs.setFont(regular, 9); cs.newLineAtOffset(0, -16); cs.showText(job.getSourceFilename() + ":");
                        cs.setFont(mono, 8); cs.newLineAtOffset(10, -13); cs.showText(raw.getSha256Hex()); cs.newLineAtOffset(-10, 0);
                    } catch (Exception ignored) {}
                });
            }
            cs.setFont(bold, 10); cs.newLineAtOffset(0, -25); cs.showText("Approver Signatures:");
            for (var sig : report.getSignatories()) {
                cs.setFont(regular, 9); cs.newLineAtOffset(0, -16);
                String signedStr = sig.getSignedAt() != null ? sig.getSignedAt().format(FMT) : "PENDING";
                cs.showText("  " + sig.getUser().getFullName() + "  (" + sig.getRole().name() + ")  -- " + signedStr);
            }
            cs.endText();
        }
    }
}

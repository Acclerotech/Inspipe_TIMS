package com.tims.report;

import com.tims.entity.*;
import com.tims.exception.BusinessException;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PdfReportService {

    private static final String CALC_VERSION = "v2.4.1";

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private static final DateTimeFormatter DATE_ONLY_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final ComplianceReportRepository reportRepository;
    private final IngestionJobRepository jobRepository;
    private final RawFileRepository rawFileRepository;
    private final CorrosionAssessmentRepository assessmentRepository;

    // Layout
    private static final float MARGIN_LEFT = 50;
    private static final float TOP_START = 760;
    private static final float LINE_HEIGHT = 14;
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();

    private float y;

    // ===================== MAIN =====================

    public byte[] generatePdf(Integer reportId) {

        long start = System.currentTimeMillis();
        log.info("Generating PDF for report {}", reportId);

        ComplianceReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceReport", reportId));

        try (PDDocument doc = new PDDocument()) {

            addCoverPage(doc, report);
            addContentPages(doc, report);
            addProvenancePage(doc, report);
            addHeadersAndFooters(doc);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);

            log.info("PDF generated in {} ms ({} pages)",
                    System.currentTimeMillis() - start,
                    doc.getNumberOfPages());

            return baos.toByteArray();

        } catch (Exception e) {
            log.error("PDF generation failed", e);
            throw new BusinessException("PDF generation failed: " + e.getMessage());
        }
    }

    // ===================== COVER =====================

    private void addCoverPage(PDDocument doc, ComplianceReport report) throws Exception {

        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        Tank tank = report.getTank();

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {

            var bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            var regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            // HEADER BAR
            cs.setNonStrokingColor(new Color(30, 58, 110));
            cs.addRect(0, 780, PAGE_WIDTH, 60);
            cs.fill();

            // HEADER TEXT
            cs.setNonStrokingColor(Color.WHITE);
            cs.beginText();
            cs.setFont(bold, 14);
            cs.newLineAtOffset(50, 805);
            cs.showText(getTemplateTitle(report.getReportRef()));

            cs.setFont(regular, 10);
            cs.newLineAtOffset(0, -15);
            cs.showText("EEMUA 159 Compliance Report");
            cs.endText();

            // BODY
            cs.setNonStrokingColor(Color.BLACK);
            cs.beginText();

            cs.setFont(bold, 12);
            cs.newLineAtOffset(50, 720);
            cs.showText("Tank: " + tank.getTankId());

            cs.setFont(regular, 10);
            cs.newLineAtOffset(0, -20);
            cs.showText("Report Ref: " + report.getReportRef());

            cs.newLineAtOffset(0, -15);
            cs.showText("Site: " + (tank.getSite() != null ? tank.getSite().getName() : "Unknown"));

            cs.newLineAtOffset(0, -15);
            cs.showText("Generated: " + report.getGeneratedAt().format(DATE_ONLY_FMT));

            cs.endText();
        }
    }

    // ===================== CONTENT =====================

    private void addContentPages(PDDocument doc, ComplianceReport report) throws Exception {

        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        PDPageContentStream cs = new PDPageContentStream(doc, page);

        var bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        var regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

        y = TOP_START;

        Tank tank = report.getTank();

        CorrosionAssessment latest = assessmentRepository
                .findFirstByTank_TankIdOrderByAssessmentDateDesc(tank.getTankId())
                .orElse(null);

        int sectionNo = 1;

        for (var section : report.getSections()) {

            if (!section.isIncluded()) continue;

            if (y < 120) {
                cs.close();
                page = new PDPage(PDRectangle.A4);
                doc.addPage(page);
                cs = new PDPageContentStream(doc, page);
                y = TOP_START;
            }

            // SECTION TITLE
            cs.beginText();
            cs.setFont(bold, 12);
            cs.setNonStrokingColor(Color.BLACK);
            cs.newLineAtOffset(MARGIN_LEFT, y);
            cs.showText(sectionNo + ". " + section.getSectionName());
            cs.endText();

            y -= 20;

            cs.beginText();
            cs.setFont(regular, 10);
            cs.setNonStrokingColor(Color.BLACK);
            cs.newLineAtOffset(MARGIN_LEFT, y);

            switch (section.getSectionName()) {

                case "Executive summary" -> {
                    String rl = latest != null && latest.getOverallRemainingLifeYr() != null
                            ? String.format("%.2f", latest.getOverallRemainingLifeYr())
                            : "N/A";

                    String cr = latest != null && latest.getShellCorrRateMmYr() != null
                            ? String.format("%.3f", latest.getShellCorrRateMmYr())
                            : "N/A";

                    cs.showText(tank.getTankId() + " has " + rl +
                            " years remaining life at corrosion rate " + cr + " mm/yr.");
                }

                case "Corrosion rate & remaining life calculation" -> {
                    cs.showText("Mean corrosion rate: " +
                            (latest != null ? latest.getShellCorrRateMmYr() : "N/A") + " mm/yr");
                    y -= LINE_HEIGHT;

                    cs.newLineAtOffset(0, -LINE_HEIGHT);
                    cs.showText("Min thickness: " +
                            (latest != null ? latest.getShellMinThicknessMm() : "N/A"));
                    y -= LINE_HEIGHT;

                    cs.newLineAtOffset(0, -LINE_HEIGHT);
                    cs.showText("Remaining life: " +
                            (latest != null ? latest.getOverallRemainingLifeYr() : "N/A") + " yr");
                }
            }

            cs.endText();
            y -= 35;
            sectionNo++;
        }

        cs.close();
    }

    // ===================== PROVENANCE =====================

    private void addProvenancePage(PDDocument doc, ComplianceReport report) throws Exception {

        boolean include = report.getSections().stream()
                .anyMatch(s -> s.isIncluded()
                        && s.getSectionName().contains("Provenance"));

        if (!include) return;

        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {

            var bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            var regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            var mono = new PDType1Font(Standard14Fonts.FontName.COURIER);

            cs.beginText();
            cs.setFont(bold, 13);
            cs.setNonStrokingColor(Color.BLACK);
            cs.newLineAtOffset(MARGIN_LEFT, 780);
            cs.showText("PROVENANCE APPENDIX");

            cs.setFont(regular, 10);
            cs.newLineAtOffset(0, -20);
            cs.showText("Engine version: " + CALC_VERSION);
            cs.endText();

            List<IngestionJob> jobs =
                    jobRepository.findByTankId(report.getTank().getId(), Pageable.unpaged()).getContent();

            float yLocal = 720;

            for (var job : jobs) {

                var raw = rawFileRepository.findByJobId(job.getId()).orElse(null);
                if (raw == null) continue;

                cs.beginText();
                cs.setFont(regular, 9);
                cs.newLineAtOffset(MARGIN_LEFT, yLocal);
                cs.showText(job.getSourceFilename());

                cs.setFont(mono, 8);
                cs.newLineAtOffset(0, -12);
                cs.showText(raw.getSha256Hex());
                cs.endText();

                yLocal -= 25;
            }

            String signers = report.getSignatories().stream()
                    .map(s -> s.getUser().getFullName())
                    .collect(Collectors.joining(", "));

            cs.beginText();
            cs.setFont(regular, 9);
            cs.newLineAtOffset(MARGIN_LEFT, yLocal - 20);
            cs.showText("Signed by: " + signers);
            cs.endText();
        }
    }

    // ===================== FOOTER =====================

    private void addHeadersAndFooters(PDDocument doc) throws Exception {

        int total = doc.getNumberOfPages();
        int year = Year.now().getValue();

        var font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

        for (int i = 0; i < total; i++) {

            PDPage page = doc.getPage(i);

            try (PDPageContentStream cs =
                         new PDPageContentStream(doc, page,
                                 PDPageContentStream.AppendMode.APPEND, true, true)) {

                cs.beginText();
                cs.setFont(font, 9);
                cs.setNonStrokingColor(new Color(150, 150, 150));

                cs.newLineAtOffset(50, 30);
                cs.showText("© " + year + " TIMS Integrity Ltd.");

                cs.newLineAtOffset(400, 0);
                cs.showText("Page " + (i + 1) + " of " + total);

                cs.endText();
            }
        }
    }

    // ===================== HELPERS =====================

    private String getTemplateTitle(String ref) {
        if (ref == null) return "Compliance Report";
        if (ref.startsWith("WSE")) return "Written Scheme of Examination";
        if (ref.startsWith("FFS")) return "EEMUA 159 §7";
        if (ref.startsWith("ISE")) return "EEMUA 159 §5";
        return "Compliance Report";
    }
}
package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.entity.*;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MflClassificationService {

    private static final BigDecimal CLASS_1_THRESHOLD = new BigDecimal("80.0");
    private static final BigDecimal CLASS_2_THRESHOLD = new BigDecimal("60.0");

    private final MflReadingRepository mflReadingRepository;
    private final DefectRepository defectRepository;
    private final DefectClassRepository defectClassRepository;
    private final AuditService auditService;

    public List<Defect> classifyAndCreateDefects(Tank tank, IngestionJob job) {
        log.info("MFL classification for tank {} job {}", tank.getId(), job.getId());
        List<MflReading> readings = mflReadingRepository.findByJobId(job.getId());
        List<Defect> created = new ArrayList<>();
        var class1 = findClass((byte) 1);
        var class2 = findClass((byte) 2);
        var class3 = findClass((byte) 3);

        for (MflReading r : readings) {
            if (r.getWallLossPct() == null) continue;
            double lossPct = r.getWallLossPct().doubleValue();
            if (lossPct < 20.0) continue;

            DefectClass dc;
            String disposition;
            if (lossPct > CLASS_1_THRESHOLD.doubleValue()) {
                dc = class1; disposition = "IMMEDIATE_ACTION";
            } else if (lossPct > CLASS_2_THRESHOLD.doubleValue()) {
                dc = class2; disposition = "MONITOR_AND_ACTION";
            } else {
                dc = class3; disposition = "MONITOR";
            }

            String defectCode = String.format("MFL-%s-%s-%s", tank.getTankId(),
                r.getPlateId() != null ? r.getPlateId() : "UNK",
                r.getAngleDeg() != null ? r.getAngleDeg().toPlainString() : "0");
            if (defectRepository.existsByDefectCode(defectCode)) continue;

            var defect = Defect.builder()
                .tank(tank).defectCode(defectCode).component(Defect.Component.FLOOR)
                .defectType("MFL_INDICATION").defectClass(dc).plateId(r.getPlateId())
                .radiusM(r.getRadiusM()).angleDeg(r.getAngleDeg())
                .wallLossMm(r.getWallLossMm()).nominalMm(r.getNominalMm())
                .maxLossPct(r.getWallLossPct()).firstDetectedDate(LocalDate.now())
                .status(Defect.Status.OPEN).disposition(disposition).linkedJob(job)
                .locationDescription(String.format("Plate %s angle %.1f deg",
                    r.getPlateId() != null ? r.getPlateId() : "UNK", lossPct))
                .build();
            var saved = defectRepository.save(defect);
            created.add(saved);
            auditService.record("Defect", saved.getId().toString(), AuditEvent.Action.CREATE, null, saved);
            log.info("Defect {} created: class={} loss={}%", defectCode, dc.getClassNum(), r.getWallLossPct());
        }
        log.info("MFL classification complete: {} defects created", created.size());
        return created;
    }

    private DefectClass findClass(byte classNum) {
        return defectClassRepository.findByClassNum(classNum)
                .orElseThrow(() -> new ResourceNotFoundException("DefectClass", classNum));
    }
}

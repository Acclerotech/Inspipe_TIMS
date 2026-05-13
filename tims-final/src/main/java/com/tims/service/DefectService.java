package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.audit.AuditEventRepository;
import com.tims.dto.request.UpdateDefectStatusRequest;
import com.tims.dto.response.DefectDetailResponse;
import com.tims.entity.Defect;
import com.tims.entity.DefectClass;
import com.tims.exception.BusinessException;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.DefectClassRepository;
import com.tims.repository.DefectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class DefectService {

    private final DefectRepository defectRepository;
    private final DefectClassRepository defectClassRepository;
    private final AuditService auditService;
    private final AuditEventRepository auditEventRepository;

    @Transactional(readOnly = true)
    public DefectDetailResponse getDefect(Integer id) {
        var d = defectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Defect", id));
        return toDetail(d);
    }

    @Transactional(readOnly = true)
    public List<com.tims.audit.AuditEvent> getDefectTimeline(Integer id) {
        if (!defectRepository.existsById(id))
            throw new ResourceNotFoundException("Defect", id);
        return auditEventRepository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(
                "Defect", id.toString());
    }

    /**
     * Returns EEMUA classification rules as human-readable reference.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getClassificationRules() {
        return defectClassRepository.findAll().stream()
                .map(dc -> Map.<String, Object>of(
                        "classNum",    dc.getClassNum(),
                        "label",       dc.getLabel(),
                        "description", dc.getDescription() != null ? dc.getDescription() : "",
                        "wallLossThresholdPct", dc.getClassNum() == 1 ? ">80%" :
                                dc.getClassNum() == 2 ? "60-80%" : "<60%"
                ))
                .toList();
    }

    /**
     * Re-classify a defect by recalculating wall-loss-based class.
     */
    public DefectDetailResponse classifyDefect(Integer defectId,
                                               java.math.BigDecimal wallLossPct) {
        var defect = defectRepository.findById(defectId)
                .orElseThrow(() -> new ResourceNotFoundException("Defect", defectId));

        var before = toDetail(defect);
        byte classNum;
        String disposition;

        if (wallLossPct.doubleValue() > 80.0) { classNum = 1; disposition = "IMMEDIATE_ACTION"; }
        else if (wallLossPct.doubleValue() > 60.0) { classNum = 2; disposition = "MONITOR_AND_ACTION"; }
        else { classNum = 3; disposition = "MONITOR"; }

        DefectClass dc = defectClassRepository.findByClassNum(classNum)
                .orElseThrow(() -> new BusinessException("DefectClass " + classNum + " not seeded"));

        defect.setDefectClass(dc);
        defect.setMaxLossPct(wallLossPct);
        defect.setDisposition(disposition);

        var saved = defectRepository.save(defect);

        auditService.record("Defect", saved.getId().toString(),
                AuditEvent.Action.UPDATE, before, toDetail(saved));

        return toDetail(saved);
    }

    public DefectDetailResponse updateStatus(Integer defectId, UpdateDefectStatusRequest req) {
        var defect = defectRepository.findById(defectId)
                .orElseThrow(() -> new ResourceNotFoundException("Defect", defectId));

        var before = toDetail(defect);
        Defect.Status newStatus;
        try { newStatus = Defect.Status.valueOf(req.getStatus().toUpperCase()); }
        catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid defect status: " + req.getStatus());
        }

        defect.setStatus(newStatus);
        if (req.getNotes() != null) defect.setNotes(req.getNotes());

        var saved = defectRepository.save(defect);

        auditService.record("Defect", saved.getId().toString(),
                AuditEvent.Action.STATUS_CHANGE, before, toDetail(saved));

        return toDetail(saved);
    }

    private DefectDetailResponse toDetail(Defect d) {
        return DefectDetailResponse.builder()
                .id(d.getId()).defectCode(d.getDefectCode())
                .tankCode(d.getTank().getTankId())
                .component(d.getComponent().name()).defectType(d.getDefectType())
                .classNum(d.getDefectClass().getClassNum())
                .classLabel(d.getDefectClass().getLabel())
                .locationDescription(d.getLocationDescription())
                .plateId(d.getPlateId()).radiusM(d.getRadiusM()).angleDeg(d.getAngleDeg())
                .heightM(d.getHeightM()).maxLossPct(d.getMaxLossPct())
                .wallLossMm(d.getWallLossMm()).nominalMm(d.getNominalMm())
                .growthRateMmYr(d.getGrowthRateMmYr()).remainingLifeYr(d.getRemainingLifeYr())
                .firstDetectedDate(d.getFirstDetectedDate()).lastObservedDate(d.getLastObservedDate())
                .status(d.getStatus().name()).disposition(d.getDisposition())
                .notes(d.getNotes()).createdAt(d.getCreatedAt())
                .build();
    }
}
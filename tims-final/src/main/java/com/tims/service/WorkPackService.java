package com.tims.service;

import com.tims.dto.response.WorkPackResponse;
import com.tims.exception.ResourceNotFoundException;
import com.tims.mapper.CorrosionMapper;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkPackService {

    private final InspectionRepository inspectionRepository;
    private final DefectRepository defectRepository;
    private final CorrosionAssessmentRepository corrosionRepo;
    private final TankRepository tankRepository;
    private final CorrosionMapper corrosionMapper;
    private final InspectionScopeItemRepository scopeItemRepository;


        public WorkPackResponse buildWorkPack(Integer inspectionId) {

            long start = System.currentTimeMillis();
            log.info("Building work pack for inspection {}", inspectionId);

            // 1. LOAD INSPECTION (no dependency on lazy collections)
            var inspection = inspectionRepository.findWorkPackRoot(inspectionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Inspection", inspectionId));

            var tank = inspection.getTank();

            // 2. USE BUSINESS KEY (CRITICAL FIX)
            String tankId = tank.getTankId();

            // 3. SCOPE ITEMS (EXPLICIT QUERY — FIXES EMPTY ISSUE)
            var scopeItems = scopeItemRepository.findByInspectionId(inspectionId);
            log.info("Scope items found: {}", scopeItems.size());
            // 4. DEFECTS (FIXED IDENTIFIER)
            var openDefects = defectRepository.findOpenByTankIdSorted(
                    tankId,
                    PageRequest.of(0, 50)
            ).getContent();
            log.info("Defects found: {}", openDefects.size());
            // 5. CORROSION (FIXED IDENTIFIER)
            var corrosionOpt = corrosionRepo.findLatestByTankId(tankId);

            // 6. BUILD RESPONSE
            var response = WorkPackResponse.builder()
                    .inspectionId(inspectionId)
                    .tankId(tankId)
                    .tankSiteName(tank.getSite().getName())
                    .riskCategory(tank.getRiskCategory().getCode())
                    .plannedDate(inspection.getPlannedDate())
                    .inspectionType(inspection.getInspectionType().getLabel())
                    .standardCode(inspection.getStandard().getCode())
                    .inspectorName(inspection.getInspector().getFullName())

                    // Scope Items (NOW GUARANTEED)
                    .scopeItems(
                            scopeItems.stream()
                                    .map(s -> WorkPackResponse.ScopeItemEntry.builder()
                                            .item(s.getScopeItem())
                                            .completed(s.isCompleted())
                                            .build())
                                    .toList()
                    )

                    // Defects
                    .openDefects(
                            openDefects.stream()
                                    .map(d -> WorkPackResponse.DefectEntry.builder()
                                            .defectCode(d.getDefectCode())
                                            .component(d.getComponent().name())
                                            .defectType(d.getDefectType())
                                            .classNum(d.getDefectClass().getClassNum())
                                            .disposition(d.getDisposition())
                                            .maxLossPct(d.getMaxLossPct())
                                            .build())
                                    .toList()
                    )

                    // Corrosion
                    .corrosionSummary(
                            corrosionOpt.map(corrosionMapper::toResponse).orElse(null)
                    )

                    .build();

            long elapsed = System.currentTimeMillis() - start;

            log.info("Work pack built in {} ms for inspection {}", elapsed, inspectionId);

            if (elapsed > 8000) {
                log.warn("AT-031 SLA VIOLATION: Work pack exceeded 8s → {}ms", elapsed);
            }

            return response;
        }
    }
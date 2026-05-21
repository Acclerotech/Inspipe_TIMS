package com.tims.service;

import com.tims.dto.response.DefectHeatmapResponse;
import com.tims.dto.response.HeatmapReadingResponse;
import com.tims.dto.response.HeatmapTimelineEntry;
import com.tims.entity.IngestionJob;
import com.tims.entity.Tank;
import com.tims.entity.UtReading;
import com.tims.exception.ResourceNotFoundException;
import com.tims.mapper.DefectMapper;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HeatmapService {

    private final VwDefectHeatmapRepository heatmapRepository;
    private final DefectMapper              defectMapper;
    private final TankRepository            tankRepository;
    private final IngestionJobRepository    jobRepository;
    private final UtReadingRepository       utReadingRepository;
    private final DefectRepository          defectRepository;

    // ── EXISTING ──────────────────────────────────────────────

    public Page<DefectHeatmapResponse> getDefectHeatmap(String status, Pageable pageable) {
        if (status != null)
            return heatmapRepository.findByStatus(status, pageable).map(defectMapper::toHeatmapResponse);
        return heatmapRepository.findAll(pageable).map(defectMapper::toHeatmapResponse);
    }

    public List<DefectHeatmapResponse> getDefectHeatmapByTank(String tankId) {
        return defectMapper.toHeatmapResponseList(heatmapRepository.findByTankId(tankId));
    }

    // ── NEW: VIZ-001 ── timeline ───────────────────────────────
    /**
     * Returns one entry per committed ingestion job for the tank,
     * ordered newest-first.  Frontend uses this to populate the time-slider.
     */
    public List<HeatmapTimelineEntry> getTimeline(String tankId) {
        Tank tank = resolveTank(tankId);

        return jobRepository
                .findByTankIdOrderByUploadDateDesc(tank.getId(), Pageable.unpaged())
                .getContent()
                .stream()
                .filter(j -> j.getStatus() == IngestionJob.Status.COMMITTED)
                .map(job -> HeatmapTimelineEntry.builder()
                        .year(job.getUploadDate().getYear())
                        .datasetId(job.getId())
                        .inspectionType(job.getTechnique().name())
                        .build())
                .sorted(Comparator.comparingInt(HeatmapTimelineEntry::getYear).reversed())
                .toList();
    }

    // ── NEW: VIZ-001 ── readings ───────────────────────────────
    /**
     * Returns UT readings for a specific dataset (ingestion job).
     * Also attaches linkedDefectId where the reading breaches retirement threshold.
     */
    public List<HeatmapReadingResponse> getReadings(String tankId, Integer datasetId) {
        Tank tank = resolveTank(tankId);

        // Verify the job belongs to this tank
        IngestionJob job = jobRepository.findById(datasetId)
                .orElseThrow(() -> new ResourceNotFoundException("IngestionJob", datasetId));
        if (!job.getTank().getId().equals(tank.getId())) {
            throw new ResourceNotFoundException("IngestionJob for tank " + tankId, datasetId);
        }

        // Load breach defect IDs keyed by readingId for O(1) linkage
        // Defects store the readingId in their defectCode after classification
        // (e.g. "UT-BREACH-T-101-READING-12345") — we use a suffix match
        // Simpler: load all below-retirement readings for this job, defect lookup by position
        List<UtReading> readings = utReadingRepository.findByJobId(datasetId);

        // Build a map: readingId -> defect id (breach defects only)
        Map<String, Integer> breachDefectByReadingId = defectRepository
                .findByLinkedJobId(datasetId)
                .stream()
                .filter(d -> d.getDefectCode() != null)
                .collect(Collectors.toMap(
                        d -> extractReadingId(d.getDefectCode()),
                        d -> d.getId(),
                        (a, b) -> a // keep first if collision
                ));

        return readings.stream()
                .map(r -> HeatmapReadingResponse.builder()
                        .id(r.getId())
                        .readingId(r.getReadingId())
                        .angleDeg(r.getAngleDeg())
                        .heightMm(r.getHeightMm())
                        .thicknessMm(r.getThicknessMm())
                        .nominalMm(r.getNominalMm())
                        .belowRetirement(r.isBelowRetirement())
                        .linkedDefectId(breachDefectByReadingId.get(r.getReadingId()))
                        .build())
                .toList();
    }

    // ── helpers ───────────────────────────────────────────────

    private Tank resolveTank(String tankId) {
        return tankRepository.findByTankId(tankId)
                .orElseThrow(() -> new ResourceNotFoundException("Tank", tankId));
    }

    /**
     * Extracts the readingId segment from a defect code.
     * Convention: "UT-BREACH-{tankId}-READING-{readingId}"
     */
    private String extractReadingId(String defectCode) {
        if (defectCode == null) return "";
        int idx = defectCode.lastIndexOf("-READING-");
        if (idx < 0) return defectCode;
        return defectCode.substring(idx + 9); // 9 = len("-READING-")
    }
}

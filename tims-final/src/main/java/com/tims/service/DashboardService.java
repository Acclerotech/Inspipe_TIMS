package com.tims.service;

import com.tims.dto.response.*;
import com.tims.mapper.TankMapper;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final TankFleetSummaryViewRepository fleetSummaryViewRepository;;
    private final TankRepository tankRepository;
    private final DefectRepository defectRepository;
    private final InspectionRepository inspectionRepository;
    private final VwTankFleetSummaryRepository fleetSummaryRepository;
    private final ThicknessHistoryRepository thicknessHistoryRepository;
    private final CorrosionAssessmentRepository corrosionAssessmentRepository;
    private final TankMapper tankMapper;

    public Page<TankFleetSummaryResponse> getFleetSummary(String riskCategory,
                                                           String complianceStatus,
                                                           Pageable pageable) {
        log.debug("Fleet summary riskCategory={} complianceStatus={}", riskCategory, complianceStatus);
        if (riskCategory != null)
            return fleetSummaryRepository.findByRiskCategory(riskCategory, pageable)
                    .map(tankMapper::toFleetSummaryResponse);
        if (complianceStatus != null)
            return fleetSummaryRepository.findByComplianceStatus(complianceStatus, pageable)
                    .map(tankMapper::toFleetSummaryResponse);
        return fleetSummaryRepository.findAll(pageable).map(tankMapper::toFleetSummaryResponse);
    }

    public DashboardMetricsResponse getMetrics() {
        log.debug("Computing dashboard metrics");
        return DashboardMetricsResponse.builder()
                .totalTanks(tankRepository.count())
                .inServiceTanks(tankRepository.countInService())
                .openDefects(defectRepository.countAllOpen())
                .overdueInspections(inspectionRepository.countOverdue())
                .overdueComplianceTanks(tankRepository.countOverdue())
                .build();
    }


    public ComplianceSummaryResponse getComplianceSummary() {

        var stats = tankRepository.getComplianceStats();

        double percent = stats.getTotal() == 0
                ? 0.0
                : (stats.getCompliant() * 100.0) / stats.getTotal();

        return ComplianceSummaryResponse.builder()
                .total(stats.getTotal())
                .compliant(stats.getCompliant())
                .actionRequired(stats.getActionRequired())
                .nonCompliant(stats.getNonCompliant())
                .percent(percent)
                .build();
    }

    // ---------------------------
    // SITE PLAN
    // ---------------------------
    public List<TankFleetSummaryResponse> getSitePlan() {

        return fleetSummaryViewRepository.findAll().stream()
                .map(tankMapper::toFleetSummaryResponse)
                .toList();
    }
    public List<ThicknessTrendResponse> getThicknessTrend() {

        return thicknessHistoryRepository.getThicknessTrend();
    }
    public List<HeatmapTankResponse> getHeatmapTanks() {

        return thicknessHistoryRepository.getHeatmapTanks();
    }
    public List<CriticalAreaResponse> getCriticalAreas() {

        return corrosionAssessmentRepository.getCriticalAreas(
                PageRequest.of(0, 10)
        );
    }
    public LifeDistributionResponse getLifeDistribution() {

        List<Object[]> rows = corrosionAssessmentRepository.getLifeDistribution();

        long total = rows.stream()
                .mapToLong(r -> ((Long) r[1]))
                .sum();

        List<LifeDistributionItemResponse> distribution = rows.stream()
                .map(r -> {

                    String bucket = (String) r[0];
                    long count = (Long) r[1];

                    double percent = total == 0
                            ? 0
                            : (count * 100.0) / total;

                    String color = switch (bucket) {
                        case "< 5 years" -> "#ef4444";
                        case "5–10 years" -> "#f97316";
                        case "10–20 years" -> "#3b82f6";
                        default -> "#22c55e";
                    };

                    return LifeDistributionItemResponse.builder()
                            .name(bucket)
                            .value(count)
                            .count(count)
                            .percent(Math.round(percent))
                            .color(color)
                            .build();
                })
                .toList();

        return LifeDistributionResponse.builder()
                .distribution(distribution)
                .build();
    }
}

package com.tims.controller;
import com.tims.dto.response.*;
import com.tims.entity.ActivityFeed;
import com.tims.repository.ActivityFeedRepository;
import com.tims.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/dashboard") @RequiredArgsConstructor
@Tag(name="Dashboard") @SecurityRequirement(name="bearerAuth")
public class DashboardController {
    private final DashboardService dashboardService;
    private final ActivityFeedRepository activityFeedRepository;

    // ── EXISTING ─────────────────────────────────────────────────────────────

    @GetMapping("/tanks")
    @Operation(summary = "Fleet summary from vw_tank_fleet_summary")
    public ResponseEntity<Page<TankFleetSummaryResponse>> getFleetSummary(
            @RequestParam(required = false) String riskCategory,
            @RequestParam(required = false) String complianceStatus,
            @PageableDefault(size = 25) Pageable pageable) {
        return ResponseEntity.ok(
                dashboardService.getFleetSummary(riskCategory, complianceStatus, pageable));
    }

    @GetMapping("/site-plan")
    public java.util.List<TankFleetSummaryResponse> sitePlan() {
        return dashboardService.getSitePlan();
    }
    @GetMapping("/metrics")
    @Operation(summary = "KPI metrics: total tanks, open defects, overdue inspections")
    public ResponseEntity<DashboardMetricsResponse> getMetrics() {
        return ResponseEntity.ok(dashboardService.getMetrics());
    }

    // ── NEW: GET /dashboard/activity ─────────────────────────────────────────
    // Status: CREATE NEW — ActivityFeed entity exists but no endpoint was exposed

    @GetMapping("/activity")
    @Operation(summary = "Recent activity feed — paginated, newest-first",
            description = "Uses existing activity_feed table. " +
                    "Filter by tankId query param for tank-specific feed.")
    public ResponseEntity<Page<ActivityFeedResponse>> getActivityFeed(
            @RequestParam(required = false) Short tankId,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<ActivityFeed> page = (tankId != null)
                ? activityFeedRepository.findByTankIdOrderByOccurredAtDesc(tankId, pageable)
                : activityFeedRepository.findAllByOrderByOccurredAtDesc(pageable);

        return ResponseEntity.ok(page.map(a -> ActivityFeedResponse.builder()
                .id(a.getId())
                .tankId(a.getTank() != null ? a.getTank().getTankId() : null)
                .userFullName(a.getUser().getFullName())
                .activityType(a.getActivityType().name())
                .title(a.getTitle())
                .detail(a.getDetail())
                .occurredAt(a.getOccurredAt())
                .build()));
    }

    @GetMapping("/compliance-summary")
    public ComplianceSummaryResponse getComplianceSummary() {
        return dashboardService.getComplianceSummary();
    }
    @GetMapping("/thickness-trend")
    @Operation(summary = "Average thickness trend by year")
    public ResponseEntity<java.util.List<ThicknessTrendResponse>> getThicknessTrend() {

        return ResponseEntity.ok(
                dashboardService.getThicknessTrend()
        );
    }
    @GetMapping("/heatmap-tanks")
    @Operation(summary = "Heatmap visualization tank data")
    public ResponseEntity<java.util.List<HeatmapTankResponse>> getHeatmapTanks() {

        return ResponseEntity.ok(
                dashboardService.getHeatmapTanks()
        );
    }
    @GetMapping("/critical-areas")
    @Operation(summary = "Top critical corrosion areas")
    public ResponseEntity<java.util.List<CriticalAreaResponse>> getCriticalAreas() {

        return ResponseEntity.ok(
                dashboardService.getCriticalAreas()
        );
    }
    @GetMapping("/life-distribution")
    @Operation(summary = "Remaining life distribution")
    public ResponseEntity<LifeDistributionResponse> getLifeDistribution() {

        return ResponseEntity.ok(
                dashboardService.getLifeDistribution()
        );
    }
}

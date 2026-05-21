package com.tims.controller;
import com.tims.dto.response.DefectHeatmapResponse;
import com.tims.service.HeatmapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/heatmap") @RequiredArgsConstructor
@Tag(name="Heatmap") @SecurityRequirement(name="bearerAuth")
public class HeatmapController {
    private final HeatmapService heatmapService;
    @GetMapping("/defects") @Operation(summary="Defect heatmap from vw_defect_heatmap")
    public ResponseEntity<Page<DefectHeatmapResponse>> getDefectHeatmap(
            @RequestParam(required=false) String status, @PageableDefault(size=50) Pageable pageable) {
        return ResponseEntity.ok(heatmapService.getDefectHeatmap(status, pageable));
    }
    @GetMapping("/defects/tank/{tankId}") @Operation(summary="All heatmap points for a tank")
    public ResponseEntity<List<DefectHeatmapResponse>> getDefectHeatmapByTank(@PathVariable String tankId) {
        return ResponseEntity.ok(heatmapService.getDefectHeatmapByTank(tankId));
    }
}

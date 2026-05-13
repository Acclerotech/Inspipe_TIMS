package com.tims.controller;
import com.tims.audit.AuditEvent;
import com.tims.dto.response.*;
import com.tims.service.TankService;
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
import java.util.Map;

@RestController @RequestMapping("/api/tanks") @RequiredArgsConstructor
@Tag(name="Tanks") @SecurityRequirement(name="bearerAuth")
public class TankController {
    private final TankService tankService;
    @GetMapping("/{tankId}") @Operation(summary="Tank detail")
    public ResponseEntity<TankResponse> getTank(@PathVariable String tankId) {
        return ResponseEntity.ok(tankService.getTank(tankId));
    }
    @GetMapping("/{tankId}/inspections") @Operation(summary="Inspections for tank newest-first")
    public ResponseEntity<Page<InspectionResponse>> getInspections(@PathVariable String tankId,
            @PageableDefault(size=20) Pageable pageable) {
        return ResponseEntity.ok(tankService.getInspections(tankId, pageable));
    }
    @GetMapping("/{tankId}/defects") @Operation(summary="Defects for tank")
    public ResponseEntity<Page<DefectResponse>> getDefects(@PathVariable String tankId,
            @PageableDefault(size=20) Pageable pageable) {
        return ResponseEntity.ok(tankService.getDefects(tankId, pageable));
    }
    @GetMapping("/{tankId}/corrosion") @Operation(summary="Latest corrosion assessment")
    public ResponseEntity<CorrosionAssessmentResponse> getCorrosion(@PathVariable String tankId) {
        return ResponseEntity.ok(tankService.getLatestCorrosionAssessment(tankId));
    }
    @GetMapping("/{tankId}/thickness-history") @Operation(summary="Thickness history for trend charts")
    public ResponseEntity<List<ThicknessHistoryResponse>> getThicknessHistory(@PathVariable String tankId) {
        return ResponseEntity.ok(tankService.getThicknessHistory(tankId));
    }
    @PatchMapping("/{tankId}/status")
    @Operation(summary = "Update tank operational or compliance status",
            description = "Body: { operationalStatus: 'IN_SERVICE|OUT_OF_SERVICE|DECOMMISSIONED', " +
                    "complianceStatus: 'COMPLIANT|ACTION_REQUIRED|OVERDUE' }")
    public ResponseEntity<TankResponse> updateTankStatus(
            @PathVariable String tankId,
            @RequestBody Map<String, String> statusBody) {
        return ResponseEntity.ok(tankService.updateTankStatus(tankId, statusBody));
    }

    // ── NEW: GET /tanks/{id}/timeline ─────────────────────────────────────────

    @GetMapping("/{tankId}/timeline")
    @Operation(summary = "Full audit timeline for a tank",
            description = "Returns all audit events for this tank ordered newest-first.")
    public ResponseEntity<List<AuditEvent>> getTankTimeline(@PathVariable Short tankId) {
        return ResponseEntity.ok(tankService.getTankTimeline(tankId));
    }

    @GetMapping("/{tankId}/audit-log")
    public ResponseEntity<List<AuditEvent>> getTankAuditLog(
            @PathVariable String tankId
    ) {

        return ResponseEntity.ok(
                tankService.getTankAuditLog(tankId)
        );
    }
}

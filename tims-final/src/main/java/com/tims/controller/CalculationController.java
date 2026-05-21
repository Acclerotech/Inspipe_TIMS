package com.tims.controller;

import com.tims.dto.request.CorrosionCalculationRequest;
import com.tims.dto.request.OverrideRequest;
import com.tims.dto.request.RemainingLifeRequest;
import com.tims.dto.response.CalculationBreakdownResponse;
import com.tims.dto.response.CalculationResponse;
import com.tims.dto.response.CorrosionOverrideResponse;
import com.tims.entity.CorrosionOverride;
import com.tims.service.CalculationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * New controller for corrosion calculations.
 * Reuses existing CorrosionAssessmentRepository + CorrosionOverrideRepository.
 *
 * GET  /calculations/{id}              - get assessment by id
 * GET  /calculations/{id}/history      - all assessments for a tank
 * GET  /calculations/validation/{id}   - validate assessment result
 * POST /calculations/corrosion         - compute corrosion rate
 * POST /calculations/remaining-life    - compute remaining life
 * POST /calculations/recompute/{id}    - recompute existing with active override
 * POST /calculations/override          - apply corrosion allowance override
 */
@RestController
@RequestMapping("/api/calculations")
@RequiredArgsConstructor
@Tag(name = "Calculations")
@SecurityRequirement(name = "bearerAuth")
public class CalculationController {

    private final CalculationService calculationService;

    @GetMapping("/{id}")
    @Operation(summary = "Get corrosion assessment by ID")
    public ResponseEntity<CalculationResponse> getCalculation(@PathVariable Integer id) {
        return ResponseEntity.ok(calculationService.getById(id));
    }

    @GetMapping("/{tankId}/history")
    @Operation(summary = "All corrosion assessments for a tank — newest-first")
    public ResponseEntity<List<CalculationResponse>> getHistory(@PathVariable String tankId) {
        return ResponseEntity.ok(calculationService.getHistory(tankId));
    }

    @GetMapping("/validation/{id}")
    @Operation(summary = "Validate a calculation result — checks retirement threshold and data completeness")
    public ResponseEntity<Map<String, Object>> validateCalculation(@PathVariable Integer id) {
        return ResponseEntity.ok(calculationService.validateCalculation(id));
    }

    @PostMapping("/corrosion")
    @Operation(summary = "Compute mean corrosion rate from two successive thickness measurements")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_ENGINEER','INTEGRITY_MANAGER')")
    public ResponseEntity<Map<String, Object>> computeCorrosion(
            @Valid @RequestBody CorrosionCalculationRequest req) {
        return ResponseEntity.ok(calculationService.computeCorrosion(req));
    }

    @PostMapping("/remaining-life")
    @Operation(summary = "Compute remaining life from current thickness, retirement threshold and rate")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_ENGINEER','INTEGRITY_MANAGER')")
    public ResponseEntity<Map<String, Object>> computeRemainingLife(
            @Valid @RequestBody RemainingLifeRequest req) {
        return ResponseEntity.ok(calculationService.computeRemainingLife(req));
    }

    @PostMapping("/recompute/{id}")
    @Operation(summary = "Recompute existing assessment applying any active corrosion override")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_ENGINEER','INTEGRITY_MANAGER')")
    public ResponseEntity<CalculationResponse> recompute(@PathVariable Integer id) {
        return ResponseEntity.ok(calculationService.recompute(id));
    }

    @PostMapping("/override")
    @Operation(summary = "Apply a corrosion allowance override for a tank",
               description = "Deactivates any existing override. Reason is mandatory. Emits OVERRIDE audit event.")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER')")
    public ResponseEntity<CorrosionOverrideResponse> applyOverride(
            @RequestBody OverrideRequest request) {

        return ResponseEntity.ok(calculationService.applyOverride(request));
    }
    // ── NEW: CALC-003 ── breakdown ────────────────────────────
    /**
     * Returns a full calculation breakdown for a tank including:
     * - mean corrosion rate
     * - local max corrosion rate (worst-point UT reading)
     * - shell min thickness, retirement threshold, remaining life
     * - active override info (if any)
     * - inspection interval recommendation
     *
     * Path variable is the business tank ID string e.g. "T-101"
     */
    @GetMapping("/{tankId}/breakdown")
    @Operation(summary = "Full calculation breakdown for a tank — CALC-003")
    public ResponseEntity<CalculationBreakdownResponse> getBreakdown(
            @PathVariable String tankId) {
        return ResponseEntity.ok(calculationService.getBreakdown(tankId));
    }
}

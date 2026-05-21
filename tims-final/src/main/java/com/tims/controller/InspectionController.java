package com.tims.controller;

import com.tims.dto.request.*;
import com.tims.dto.response.*;
import com.tims.entity.ComplianceStandard;
import com.tims.service.InspectionService;
import com.tims.service.WorkPackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inspections")
@RequiredArgsConstructor
@Tag(name = "Inspections")
@SecurityRequirement(name = "bearerAuth")
public class InspectionController {

    private final InspectionService inspectionService;
    private final WorkPackService workPackService;

    // ─────────────────────────────────────────────────────────────────────────
    // LIST / SEARCH
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Get inspections list")
    public ResponseEntity<Page<InspectionResponse>> getAll(
            @RequestParam(required = false) String tankId,
            @RequestParam(required = false) String status,
            Pageable pageable
    ) {
        return ResponseEntity.ok(
                inspectionService.getAll(tankId, status, pageable)
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get inspection by ID")
    public ResponseEntity<InspectionResponse> getById(
            @PathVariable Integer id
    ) {
        return ResponseEntity.ok(
                inspectionService.getById(id)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping
    @Operation(summary = "Schedule new inspection")
    public ResponseEntity<InspectionResponse> createInspection(
            @Valid @RequestBody CreateInspectionRequest req
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(inspectionService.createInspection(req));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @Operation(summary = "Update inspection")
    public ResponseEntity<InspectionResponse> updateInspection(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateInspectionRequest req
    ) {
        return ResponseEntity.ok(
                inspectionService.updateInspection(id, req)
        );
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Advance inspection status through state machine")
    public ResponseEntity<InspectionResponse> updateStatus(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateInspectionStatusRequest req
    ) {
        return ResponseEntity.ok(
                inspectionService.updateStatus(id, req)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────

//    @DeleteMapping("/{id}")
//    @Operation(summary = "Delete inspection")
//    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER')")
//    public ResponseEntity<Void> deleteInspection(
//            @PathVariable Integer id
//    ) {
//        inspectionService.deleteInspection(id);
//        return ResponseEntity.noContent().build();
//    }

    // ─────────────────────────────────────────────────────────────────────────
    // REOPEN
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/{id}/reopen")
    @Operation(summary = "Re-open APPROVED inspection")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER')")
    public ResponseEntity<InspectionResponse> reopen(
            @PathVariable Integer id,
            @Valid @RequestBody ReopenInspectionRequest req
    ) {
        return ResponseEntity.ok(
                inspectionService.reopenInspection(id, req)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CALENDAR
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/calendar")
    @Operation(summary = "Calendar view from vw_inspection_calendar")
    public ResponseEntity<List<InspectionCalendarResponse>> getCalendar(
            @RequestParam(required = false) Short fromWeek,
            @RequestParam(required = false) Short toWeek
    ) {
        return ResponseEntity.ok(
                inspectionService.getCalendar(fromWeek, toWeek)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WORKPACK
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/{inspectionId}/workpack")
    @Operation(summary = "Generate work pack")
    public ResponseEntity<WorkPackResponse> getWorkPack(
            @PathVariable Integer inspectionId
    ) {
        return ResponseEntity.ok(
                workPackService.buildWorkPack(inspectionId)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONFLICTS
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/conflicts")
    @Operation(summary = "Get inspection scheduling conflicts")
    public ResponseEntity<List<InspectionConflictResponse>> getConflicts(
            @RequestParam(defaultValue = "false") boolean unreadOnly
    ) {
        return ResponseEntity.ok(
                inspectionService.getConflicts(unreadOnly)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOOKUP ENDPOINTS FOR FRONTEND
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/inspection-types")
    @Operation(summary = "Get inspection types")
    public ResponseEntity<List<InspectionTypeResponse>> getInspectionTypes() {
        return ResponseEntity.ok(
                inspectionService.getInspectionTypes()
        );
    }

    @GetMapping("/inspection-standards")
    @Operation(summary = "Get inspection standards")
    public ResponseEntity<List<InspectionStandardResponse>> getInspectionStandards() {
        return ResponseEntity.ok(
                inspectionService.getInspectionStandards()
        );
    }

    @GetMapping("/templates")
    @Operation(summary = "Get inspection templates")
    public ResponseEntity<List<InspectionTemplateResponse>> getTemplates() {
        return ResponseEntity.ok(
                inspectionService.getTemplates()
        );
    }

    @PostMapping("/templates/recommend")
    @Operation(summary = "Recommend inspection template")
    public ResponseEntity<TemplateRecommendationResponse> recommendTemplate(
            @RequestBody TemplateRecommendationRequest req
    ) {
        return ResponseEntity.ok(
                inspectionService.recommendTemplate(req)
        );
    }

}
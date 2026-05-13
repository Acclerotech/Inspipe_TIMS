package com.tims.controller;
import com.tims.dto.request.*;
import com.tims.dto.response.*;
import com.tims.service.InspectionService;
import com.tims.service.WorkPackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/inspections") @RequiredArgsConstructor
@Tag(name="Inspections") @SecurityRequirement(name="bearerAuth")
public class InspectionController {
    private final InspectionService inspectionService;
    private final WorkPackService workPackService;
    @GetMapping("/calendar") @Operation(summary="Calendar view from vw_inspection_calendar")
    public ResponseEntity<List<InspectionCalendarResponse>> getCalendar(
            @RequestParam(required=false) Short fromWeek, @RequestParam(required=false) Short toWeek) {
        return ResponseEntity.ok(inspectionService.getCalendar(fromWeek, toWeek));
    }
    @PostMapping @Operation(summary="Schedule new inspection")
    public ResponseEntity<InspectionResponse> createInspection(@Valid @RequestBody CreateInspectionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inspectionService.createInspection(req));
    }
    @PatchMapping("/{id}/status") @Operation(summary="Advance inspection status through state machine")
    public ResponseEntity<InspectionResponse> updateStatus(@PathVariable Integer id,
            @Valid @RequestBody UpdateInspectionStatusRequest req) {
        return ResponseEntity.ok(inspectionService.updateStatus(id, req));
    }
    @PostMapping("/{id}/reopen")
    @Operation(summary="Re-open APPROVED inspection (WF-02) - reason mandatory")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER')")
    public ResponseEntity<InspectionResponse> reopen(@PathVariable Integer id,
            @Valid @RequestBody ReopenInspectionRequest req) {
        return ResponseEntity.ok(inspectionService.reopenInspection(id, req));
    }
    @PostMapping("/{inspectionId}/workpack") @Operation(summary="Generate work pack (<=8s)")
    public ResponseEntity<WorkPackResponse> getWorkPack(@PathVariable Integer inspectionId) {
        return ResponseEntity.ok(workPackService.buildWorkPack(inspectionId));
    }

    @GetMapping("/conflicts")
    @Operation(summary = "Get inspection scheduling conflicts")
    public ResponseEntity<List<InspectionConflictResponse>> getConflicts(
            @RequestParam(defaultValue = "false") boolean unreadOnly
    ) {
        return ResponseEntity.ok(
                inspectionService.getConflicts(unreadOnly)
        );
    }
}

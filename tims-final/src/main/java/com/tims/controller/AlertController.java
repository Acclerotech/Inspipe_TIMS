// controller/AlertController.java
package com.tims.controller;

import com.tims.dto.response.InspectionAlertResponse;
import com.tims.entity.InspectionAlert;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.InspectionAlertRepository;
import com.tims.repository.UserRepository;
import com.tims.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts")
@SecurityRequirement(name = "bearerAuth")
public class AlertController {

    private final AlertService alertService;
    private final InspectionAlertRepository alertRepository;
    private final UserRepository userRepository;

    @GetMapping("/my")
    @Operation(summary = "Unread alerts for current user")
    public ResponseEntity<Page<InspectionAlert>> getMyAlerts(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(alertService.getMyAlerts(pageable));
    }

    @GetMapping
    @Operation(summary = "All alerts")
    public ResponseEntity<Page<InspectionAlertResponse>> getAllAlerts(
            @RequestParam(required = false) Boolean unreadOnly,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(alertService.getAllAlerts(unreadOnly, pageable));
    }

    @PatchMapping("/{id}/acknowledge")
    @Operation(summary = "Mark alert as read")
    public ResponseEntity<InspectionAlert> acknowledge(@PathVariable Integer id) {
        return ResponseEntity.ok(alertService.acknowledgeAlert(id));
    }
    // ── NEW: GET /alerts/unread ───────────────────────────────────────────────
    // Status: EXTEND EXISTING — alias for /alerts?unreadOnly=true for current user

    @GetMapping("/unread")
    @Operation(
            summary = "All unread alerts for current user",
            description = "Returns unread alerts for authenticated user"
    )
    public ResponseEntity<Page<InspectionAlertResponse>> getUnread(Pageable pageable) {
        return ResponseEntity.ok(alertService.getUnreadAlerts(pageable));
    }

    // ── NEW: POST /alerts/acknowledge ─────────────────────────────────────────
    // Status: EXTEND EXISTING — bulk acknowledge by list of IDs

    @PostMapping("/acknowledge")
    @Operation(summary = "Bulk acknowledge alerts by list of IDs")
    public ResponseEntity<Void> bulkAcknowledge(@RequestBody java.util.List<Integer> ids) {
        ids.forEach(id -> alertRepository.findById(id).ifPresent(alert -> {
            alert.setRead(true);
            alert.setAcknowledgedAt(LocalDateTime.now());
            alertRepository.save(alert);
        }));
        return ResponseEntity.noContent().build();
    }
}
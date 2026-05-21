package com.tims.controller;
import com.tims.audit.AuditEvent;
import com.tims.audit.AuditEventRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/audit") @RequiredArgsConstructor
@Tag(name="Audit") @SecurityRequirement(name="bearerAuth")
public class AuditController {
    private final AuditEventRepository auditRepo;
    @GetMapping("/{entityType}/{entityId}")
    @Operation(summary="Full audit trail for an entity")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER')")
    public ResponseEntity<List<AuditEvent>> getAuditTrail(
            @PathVariable String entityType, @PathVariable String entityId) {
        return ResponseEntity.ok(auditRepo.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(entityType, entityId));
    }
    @GetMapping("/{entityType}/{entityId}/paged")
    @Operation(summary="Paginated audit trail")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER')")
    public ResponseEntity<Page<AuditEvent>> getAuditTrailPaged(
            @PathVariable String entityType, @PathVariable String entityId,
            @PageableDefault(size=50) Pageable pageable) {
        return ResponseEntity.ok(auditRepo.findByEntityTypeAndEntityId(entityType, entityId, pageable));
    }
}

package com.tims.controller;

import com.tims.dto.admin.*;
import com.tims.service.IntegrationAdminService;
import com.tims.service.NotificationAdminService;
import com.tims.service.SettingsAdminService;
import com.tims.service.UserAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Administration API — all endpoints require ROLE_ADMIN.
 *
 * Covered endpoints (mirrors React AdminPage contract):
 *
 *  Users & Roles
 *    GET    /api/admin/users                      → AdminUserDto[]
 *    POST   /api/admin/users/invite               → AdminUserDto
 *    PATCH  /api/admin/users/{id}                 → AdminUserDto
 *
 *  System Settings
 *    GET    /api/admin/settings                   → SystemSettingDto[]
 *    PUT    /api/admin/settings                   → SystemSettingDto[]
 *
 *  Audit Log
 *    GET    /api/admin/audit-log?page=&size=      → Page<AdminAuditEventDto>
 *
 *  Notifications
 *    GET    /api/admin/notifications              → NotificationPreferenceDto[]
 *    PUT    /api/admin/notifications              → NotificationPreferenceDto[]
 *
 *  Integrations
 *    GET    /api/admin/integrations               → IntegrationStatusDto[]
 *
 * Security is enforced at two levels:
 *   1. SecurityFilterChain rule: .requestMatchers("/api/admin/**").hasRole("ADMIN")
 *   2. Method-level @PreAuthorize on each handler (defence in depth)
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Administration")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final UserAdminService         userAdminService;
    private final SettingsAdminService     settingsAdminService;
    private final NotificationAdminService notificationAdminService;
    private final IntegrationAdminService  integrationAdminService;

    // ── Users & Roles ─────────────────────────────────────────────────────────

    @GetMapping("/users")
    @Operation(summary = "List all users (admin directory)")
    public ResponseEntity<List<AdminUserDto>> listUsers() {
        return ResponseEntity.ok(userAdminService.listAll());
    }

    @PostMapping("/users/invite")
    @Operation(summary = "Invite a new user (creates account with PENDING status)")
    public ResponseEntity<AdminUserDto> inviteUser(
            @Valid @RequestBody InviteUserRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userAdminService.invite(req));
    }

    @PatchMapping("/users/{id}")
    @Operation(summary = "Update a user's role and/or status")
    public ResponseEntity<AdminUserDto> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest req) {
        return ResponseEntity.ok(userAdminService.update(id, req));
    }

    // ── System Settings ───────────────────────────────────────────────────────

    @GetMapping("/settings")
    @Operation(summary = "Retrieve all system settings")
    public ResponseEntity<List<SystemSettingDto>> listSettings() {
        return ResponseEntity.ok(settingsAdminService.listAll());
    }

    @PutMapping("/settings")
    @Operation(summary = "Bulk-save editable system settings")
    public ResponseEntity<List<SystemSettingDto>> saveSettings(
            @RequestBody List<SystemSettingDto> updates) {
        return ResponseEntity.ok(settingsAdminService.saveAll(updates));
    }

    // ── Audit Log ─────────────────────────────────────────────────────────────

    @GetMapping("/audit-log")
    @Operation(summary = "Paginated global audit trail (newest-first)",
               description = "Query params: page (0-based) and size (default 20). " +
                             "Returns a Spring Page with content, totalElements, totalPages.")
    public ResponseEntity<Page<AdminAuditEventDto>> getAuditLog(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(integrationAdminService.listAuditLog(pageable));
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    @GetMapping("/notifications")
    @Operation(summary = "Retrieve all notification preferences")
    public ResponseEntity<List<NotificationPreferenceDto>> listNotifications() {
        return ResponseEntity.ok(notificationAdminService.listAll());
    }

    @PutMapping("/notifications")
    @Operation(summary = "Bulk-save notification preferences")
    public ResponseEntity<List<NotificationPreferenceDto>> saveNotifications(
            @RequestBody List<NotificationPreferenceDto> updates) {
        return ResponseEntity.ok(notificationAdminService.saveAll(updates));
    }

    // ── Integrations ──────────────────────────────────────────────────────────

    @GetMapping("/integrations")
    @Operation(summary = "Retrieve status of all external system integrations")
    public ResponseEntity<List<IntegrationStatusDto>> listIntegrations() {
        return ResponseEntity.ok(integrationAdminService.listIntegrations());
    }
}

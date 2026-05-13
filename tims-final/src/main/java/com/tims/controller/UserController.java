package com.tims.controller;

import com.tims.dto.request.ValidateActionRequest;
import com.tims.dto.response.AccessValidationResponse;
import com.tims.dto.response.UserMeResponse;
import com.tims.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * New controller for user profile and permission APIs.
 *
 * GET  /users/me              - current user profile
 * GET  /users/roles           - all roles with their permissions
 * GET  /permissions/{id}      - permissions for a specific user
 * POST /access/validate-action - check if current user can perform an action
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Users & Permissions")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @GetMapping("/api/users/me")
    @Operation(summary = "Current authenticated user profile")
    public ResponseEntity<UserMeResponse> getMe() {
        return ResponseEntity.ok(userService.getCurrentUser());
    }

    @GetMapping("/api/users/roles")
    @Operation(summary = "All roles with their permitted actions")
    public ResponseEntity<List<Map<String, Object>>> getRoles() {
        return ResponseEntity.ok(userService.getRoles());
    }

    @GetMapping("/api/permissions/{userId}")
    @Operation(summary = "Permissions for a specific user by ID")
    public ResponseEntity<List<String>> getUserPermissions(@PathVariable Short userId) {
        return ResponseEntity.ok(userService.getUserPermissions(userId));
    }

    @PostMapping("/api/access/validate-action")
    @Operation(summary = "Validate whether the current user can perform a given action",
               description = "Returns { allowed: true/false, action, entityType, reason }. " +
                             "Actions: READ, WRITE, DELETE, APPROVE, SIGN, REOPEN, INGEST, OVERRIDE")
    public ResponseEntity<AccessValidationResponse> validateAction(
            @Valid @RequestBody ValidateActionRequest req) {
        return ResponseEntity.ok(userService.validateAction(req));
    }
}

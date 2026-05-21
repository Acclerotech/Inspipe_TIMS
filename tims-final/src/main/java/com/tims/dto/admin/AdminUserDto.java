package com.tims.dto.admin;

import lombok.Builder;
import lombok.Value;

/**
 * Response DTO for /api/admin/users.
 * Mirrors the frontend AdminUserDto interface exactly:
 *   id, name, email, role, status ('Active'|'Inactive'|'Pending'), lastLogin
 */
@Value
@Builder
public class AdminUserDto {
    Long   id;
    String name;
    String email;
    String role;
    String status;   // 'Active' | 'Inactive' | 'Pending'
    String lastLogin; // ISO-8601 string or null
}

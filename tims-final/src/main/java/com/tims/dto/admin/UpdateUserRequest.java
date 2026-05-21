package com.tims.dto.admin;

import lombok.Data;

/** Request body for PATCH /api/admin/users/{id}. Both fields are optional (partial update). */
@Data
public class UpdateUserRequest {
    private String role;    // nullable — only update if provided
    private String status;  // nullable — only update if provided ('Active'|'Inactive')
}

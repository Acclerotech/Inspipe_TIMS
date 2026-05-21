package com.tims.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Request body for POST /api/admin/users/invite. */
@Data
public class InviteUserRequest {
    @NotBlank @Email
    private String email;

    @NotBlank
    private String role;
}

package com.tims.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
@Data
public class ValidateActionRequest {
    @NotBlank private String action;
    @NotBlank private String entityType;
    private String entityId;
}
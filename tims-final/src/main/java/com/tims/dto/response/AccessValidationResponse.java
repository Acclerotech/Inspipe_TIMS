package com.tims.dto.response;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessValidationResponse {
    private boolean allowed;
    private String action;
    private String entityType;
    private String reason;
}
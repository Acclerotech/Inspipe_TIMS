package com.tims.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
@Data
public class UpdateDefectStatusRequest {
    @NotBlank private String status;  // OPEN | CLOSED | MONITOR
    private String notes;
}

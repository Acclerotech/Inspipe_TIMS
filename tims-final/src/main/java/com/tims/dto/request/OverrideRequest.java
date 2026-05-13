package com.tims.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class OverrideRequest {
    @NotNull private Short tankId;
    @NotNull private BigDecimal overrideAllowanceMm;
    @NotBlank private String reason;
}
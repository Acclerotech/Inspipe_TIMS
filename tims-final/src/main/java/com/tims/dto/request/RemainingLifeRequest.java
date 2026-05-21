package com.tims.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class RemainingLifeRequest {
    @NotNull private String tankId;
    @NotNull private BigDecimal currentMinThicknessMm;
    @NotNull private BigDecimal retirementMm;
    @NotNull private BigDecimal corrRateMmYr;
}

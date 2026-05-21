package com.tims.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class CorrosionCalculationRequest {
    @NotNull private String tankId;
    private BigDecimal prevMeanThicknessMm;
    private BigDecimal currMeanThicknessMm;
    private BigDecimal yearsElapsed;
    private BigDecimal nominalMm;
    private BigDecimal retirementMm;
}
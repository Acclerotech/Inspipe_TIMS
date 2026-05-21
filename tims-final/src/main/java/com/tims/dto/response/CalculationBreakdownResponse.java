package com.tims.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CalculationBreakdownResponse {
    private Short      tankId;
    private String     tankRef;

    // Mean corrosion
    private BigDecimal meanCorrRateMmYr;
    // Local max corrosion (worst-point reading)
    private BigDecimal localMaxCorrRateMmYr;

    private BigDecimal shellMinThicknessMm;
//    private BigDecimal retirementThresholdMm;
    private BigDecimal remainingLifeYr;
    private boolean    actionRequired;

    // Override info (null if none active)
    private BigDecimal overrideAllowanceMm;
    private String     overrideReason;
    private String     overriddenBy;

    private String     inspectionIntervalRecommendation;
    private String     calcVersion;
    private LocalDate  assessmentDate;
}

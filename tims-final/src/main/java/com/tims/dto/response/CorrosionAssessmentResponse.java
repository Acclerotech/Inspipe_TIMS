package com.tims.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CorrosionAssessmentResponse {
    private Integer id;
    private String tankId;
    private LocalDate assessmentDate;
    private String standardCode;
    private String assessedByName;
    private BigDecimal shellRemainingLifeYr;
    private BigDecimal shellCorrRateMmYr;
    private BigDecimal shellMinThicknessMm;
    private BigDecimal shellRetirementMm;
    private BigDecimal floorRemainingLifeYr;
    private BigDecimal floorCorrRateMmYr;
    private BigDecimal roofRemainingLifeYr;
    private BigDecimal overallRemainingLifeYr;
    private BigDecimal kFactor;
    private LocalDate nextInspectionDue;
    private BigDecimal settlementMaxMm;
    private String coatingCondition;
    private String notes;
    private LocalDateTime createdAt;
}

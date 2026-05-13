package com.tims.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DefectDetailResponse {
    private Integer id;
    private String defectCode;
    private String tankCode;
    private String component;
    private String defectType;
    private Byte classNum;
    private String classLabel;
    private String locationDescription;
    private String plateId;
    private BigDecimal radiusM;
    private BigDecimal angleDeg;
    private BigDecimal heightM;
    private BigDecimal maxLossPct;
    private BigDecimal wallLossMm;
    private BigDecimal nominalMm;
    private BigDecimal growthRateMmYr;
    private BigDecimal remainingLifeYr;
    private LocalDate firstDetectedDate;
    private LocalDate lastObservedDate;
    private String status;
    private String disposition;
    private String notes;
    private LocalDateTime createdAt;
}
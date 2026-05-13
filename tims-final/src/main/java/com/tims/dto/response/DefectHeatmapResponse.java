package com.tims.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DefectHeatmapResponse {
    private String defectCode;
    private String tankId;
    private String component;
    private String defectType;
    private String severity;
    private Byte classNum;
    private String plateId;
    private BigDecimal radiusM;
    private BigDecimal angleDeg;
    private BigDecimal maxLossPct;
    private BigDecimal wallLossMm;
    private BigDecimal growthRateMmYr;
    private String disposition;
    private String status;
    private LocalDate firstDetectedDate;
    private LocalDate lastObservedDate;
}

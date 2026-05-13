package com.tims.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TankFleetSummaryResponse {
    private String tankId;
    private String siteName;
    private String service;
    private String riskCategory;
    private String complianceStatus;
    private BigDecimal remainingLifeYr;
    private BigDecimal corrosionRate;
    private LocalDate nextInspectionDue;
    private LocalDate lastInspectionDate;
    private String lastInspectionType;
    private Long openDefects;
}

package com.tims.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class TankMetricsResponse {
    private BigDecimal currentThickness;
    private BigDecimal currentThicknessTrend; // Optional: change vs last year
    private BigDecimal minThickness;
    private BigDecimal minThicknessTrend;
    private BigDecimal corrosionRate;
    private BigDecimal corrosionRateTrend;
    private BigDecimal remainingLife;
    private BigDecimal remainingLifeTrend;
    private Integer criticalAreas;
    private Integer criticalAreasTrend;
    private String complianceStatus;
    private Integer complianceScore;
}

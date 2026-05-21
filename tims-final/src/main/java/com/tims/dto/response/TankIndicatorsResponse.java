package com.tims.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TankIndicatorsResponse {
    private BigDecimal remainingLife;      // years
    private BigDecimal corrosionRate;      // mm/yr
    private boolean    actionRequired;
    private String     inspectionStatus;   // latest inspection status or "NO_INSPECTION"
    private String     complianceStatus;   // COMPLIANT | ACTION_REQUIRED | OVERDUE
}
package com.tims.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CorrosionOverrideResponse {
    private Long id;
    private String tankId;
    private BigDecimal defaultAllowanceMm;
    private BigDecimal overrideAllowanceMm;
    private String reason;
    private String overriddenBy;
    private Boolean active;
}
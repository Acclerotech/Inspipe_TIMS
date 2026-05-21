package com.tims.dto.response;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
@Data
public class ClassifyDefectRequest {
    @NotNull private Integer defectId;
    private BigDecimal wallLossPct;
    private BigDecimal wallLossMm;
    private BigDecimal nominalMm;
}
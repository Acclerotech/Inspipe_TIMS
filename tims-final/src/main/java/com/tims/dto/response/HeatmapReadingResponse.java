package com.tims.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class HeatmapReadingResponse {
    private Long       id;
    private String     readingId;
    private BigDecimal angleDeg;       // x-coord for D3 polar
    private BigDecimal heightMm;       // y-coord for D3 polar
    private BigDecimal thicknessMm;    // heat value
    private BigDecimal nominalMm;      // reference for % loss calc
    private boolean    belowRetirement;
    private Integer    linkedDefectId; // null if no breach
}
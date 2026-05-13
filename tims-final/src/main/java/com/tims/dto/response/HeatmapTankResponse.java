package com.tims.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeatmapTankResponse {

    private String tankId;

    private String service;

    private String riskCategory;

    private String riskColor;

    private String complianceStatus;

    private Double avgThickness;

    private BigDecimal minThickness;
}
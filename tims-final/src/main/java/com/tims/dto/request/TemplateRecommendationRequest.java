package com.tims.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateRecommendationRequest {

    @NotBlank
    private String tankId;

    /**
     * Optional context override (only used if backend cannot infer)
     */
    private Integer inspectionTypeId;

    /**
     * Optional override flag: if true, ignore DB-derived risk scoring
     */
    private Boolean useClientSignals;

    /**
     * Only used if useClientSignals = true
     */
    private Integer assetAgeYears;

    private String corrosionRiskLevel; // LOW, MEDIUM, HIGH
}
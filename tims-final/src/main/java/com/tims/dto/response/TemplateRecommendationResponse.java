package com.tims.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateRecommendationResponse {

    private String templateId;        // e.g. "wse"
    private String templateCode;      // WSE / FFS / ILS
    private String templateName;

    private String reason;

    private Double confidenceScore;

    private String recommendationStrategy; // RULE_ENGINE_V2, ML_V1 etc
}
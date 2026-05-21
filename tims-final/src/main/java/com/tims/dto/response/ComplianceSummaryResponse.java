package com.tims.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceSummaryResponse {
    private Long total;
    private Long compliant;
    private Long actionRequired;
    private Long nonCompliant;
    private double percent;
}
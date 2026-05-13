package com.tims.dto.response;
import lombok.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DashboardMetricsResponse {
    private long totalTanks;
    private long inServiceTanks;
    private long openDefects;
    private long overdueInspections;
    private long overdueComplianceTanks;
    private long compliantTanks;
    private long actionRequiredTanks;
    private long nonCompliantTanks;
    private double percentCompliant;
    private double compliancePercent;
}

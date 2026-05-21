package com.tims.dto.response;


import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivitySummaryResponse {

    private long total;

    private long assetActivities;

    private long inspectionActivities;

    private long userManagement;

    private long systemActivities;

    private Integer assetPct;

    private Integer inspectionPct;

    private Integer userPct;

    private Integer systemPct;
}

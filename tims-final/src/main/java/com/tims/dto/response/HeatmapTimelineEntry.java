package com.tims.dto.response;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class HeatmapTimelineEntry {
    private int     year;
    private Integer datasetId;     // ingestion_jobs.id
    private String  inspectionType; // UT | MFL | VISUAL
}
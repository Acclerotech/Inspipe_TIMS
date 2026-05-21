package com.tims.dto.response;
import lombok.*;
import java.time.LocalDateTime;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class IngestionJobResponse {
    private Integer id;
    private String tankId;
    private Integer inspectionId;
    private String technique;
    private String sourceFilename;
    private String fileSha256;
    private String uploadedByName;
    private LocalDateTime uploadDate;
    private Integer totalRows;
    private Integer duplicateCount;
    private Integer outOfRangeCount;
    private String status;
    private LocalDateTime committedAt;
}

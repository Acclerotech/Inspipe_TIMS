package com.tims.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class InspectionResponse {
    private Integer id;
    private String tankId;
    private String inspectionTypeCode;
    private String inspectionTypeLabel;
    private String inspectionTypeColor;
    private String standardCode;
    private String inspectorName;
    private LocalDate plannedDate;
    private LocalDate actualDate;
    private String status;
    private Short weekNumber;
    private BigDecimal intervalYears;
    private String intervalBasis;
    private String notes;
    private String reopenReason;
    private Integer reopenCount;
    private LocalDateTime createdAt;
    private Long ingestionJobId;
    private String datasetFilename;
    private String datasetUrl;
    private List<ScopeItemResponse> scopeItems;
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ScopeItemResponse { private Integer id; private String scopeItem; private boolean completed; }
}

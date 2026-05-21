package com.tims.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkPackResponse {
    private Integer inspectionId;
    private String tankId;
    private String tankSiteName;
    private String riskCategory;
    private LocalDate plannedDate;
    private String inspectionType;
    private String standardCode;
    private String inspectorName;
    private List<ScopeItemEntry> scopeItems;
    private List<DefectEntry> openDefects;
    private CorrosionAssessmentResponse corrosionSummary;
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ScopeItemEntry { private String item; private boolean completed; }
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DefectEntry { private String defectCode; private String component; private String defectType; private Byte classNum; private String disposition; private BigDecimal maxLossPct; }
}

package com.tims.dto.response;
import lombok.*;
import java.time.LocalDate;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class InspectionCalendarResponse {
    private Integer inspectionId;
    private String tankId;
    private String siteName;
    private String riskCategory;
    private String inspectionType;
    private String colorHex;
    private Short weekNumber;
    private LocalDate plannedDate;
    private LocalDate actualDate;
    private String status;
    private String inspectorName;
}

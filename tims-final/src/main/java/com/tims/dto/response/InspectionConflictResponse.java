package com.tims.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionConflictResponse {

    private Integer alertId;

    private Integer inspectionId;

    private String tankId;

    private String inspectorName;

    private LocalDate plannedDate;

    private LocalDate proposedDate;

    private String message;

    private boolean read;

    private LocalDateTime createdAt;
}
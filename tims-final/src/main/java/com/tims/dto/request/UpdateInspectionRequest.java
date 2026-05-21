package com.tims.dto.request;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateInspectionRequest {

    private LocalDate plannedDate;

    private LocalDate actualDate;

    private Short weekNumber;

    private BigDecimal intervalYears;

    private String intervalBasis;

    private String notes;

    private Integer inspectionTypeId;

    private Integer standardId;

    private Integer inspectorId;

    private List<String> scopeItems;
}
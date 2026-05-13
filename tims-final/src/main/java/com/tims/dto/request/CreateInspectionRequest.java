package com.tims.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
@Data public class CreateInspectionRequest {
    @NotNull private Short tankId;
    @NotNull private Byte inspectionTypeId;
    @NotNull private Short standardId;
    @NotNull private Short inspectorId;
    private LocalDate plannedDate;
    @Min(1) @Max(53) private Short weekNumber;
    @DecimalMin("0.0") private BigDecimal intervalYears;
    @Size(max=80) private String intervalBasis;
    @Size(max=2000) private String notes;
    private List<String> scopeItems;
}

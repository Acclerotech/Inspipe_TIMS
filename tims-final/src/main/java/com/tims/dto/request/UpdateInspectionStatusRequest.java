package com.tims.dto.request;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;
@Data public class UpdateInspectionStatusRequest {
    @NotBlank private String status;
    private LocalDate actualDate;
    private String notes;
}

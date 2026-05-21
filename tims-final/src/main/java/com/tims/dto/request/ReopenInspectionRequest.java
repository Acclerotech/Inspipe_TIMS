package com.tims.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data public class ReopenInspectionRequest {
    @NotBlank(message="Reason is mandatory for re-open")
    @Size(min=10,max=500) private String reason;
}

package com.tims.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;
@Data public class CreateReportRequest {
    @NotNull private String tankId;
    @NotNull private Byte templateId;
    @NotNull private Short standardId;
    @NotBlank @Size(max=30) private String reportRef;
    @NotNull private LocalDate inspectionDate;
    @Size(max=20) private String units;
    private List<String> sectionNames;
    private List<SignatoryEntry> signatories;
    @Data public static class SignatoryEntry {
        @NotNull private Short userId;
        @NotBlank private String role;
    }
}

package com.tims.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
@Data public class UploadIngestionRequest {
    @NotNull private String tankId;
    private Integer inspectionId;
    @NotNull private String technique;
    @NotBlank @Size(max=255) private String sourceFilename;
    @Size(max=64) private String fileSha256;
    private Integer totalRows;
}

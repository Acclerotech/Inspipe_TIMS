package com.tims.dto.request;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;
@Data public class ColumnMappingRequest {
    @NotEmpty @Valid private List<MappingEntry> mappings;
    @Data public static class MappingEntry {
        @NotBlank private String sourceColumn;
        @NotBlank private String timsField;
        private boolean required;
    }
}

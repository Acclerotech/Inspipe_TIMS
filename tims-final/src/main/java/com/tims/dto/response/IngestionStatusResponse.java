package com.tims.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IngestionStatusResponse {
    private Integer jobId;
    private String  status;     // UPLOADED | MAPPING | VALIDATED | COMMITTED | FAILED
    private int     progress;   // 0-100
    private String  step;       // UPLOADING | MAPPING | VALIDATING | COMMITTING | DONE | FAILED
    private List<String> warnings;
    private List<String> errors;
}
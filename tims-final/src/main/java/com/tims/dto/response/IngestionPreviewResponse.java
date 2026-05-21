package com.tims.dto.response;



import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IngestionPreviewResponse {
    private Integer jobId;
    private String sourceFilename;
    private Integer totalRows;
    private List<String> columnNames;
    private List<Map<String, Object>> sampleRows;
}
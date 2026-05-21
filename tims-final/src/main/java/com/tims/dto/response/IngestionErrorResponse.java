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
public class IngestionErrorResponse {
    private Integer jobId;
    private Integer totalErrors;
    private Integer duplicateCount;
    private Integer outOfRangeCount;
    private List<String> errorDetails;
}

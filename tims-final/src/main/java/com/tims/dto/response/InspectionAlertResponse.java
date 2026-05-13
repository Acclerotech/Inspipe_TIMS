package com.tims.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionAlertResponse {
    private Integer id;
    private String message;
    private boolean read;
    private LocalDateTime createdAt;

    private String tankName;
    private String siteName;
    private String organisationName;
}

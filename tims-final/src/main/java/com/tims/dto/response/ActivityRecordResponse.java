package com.tims.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityRecordResponse {

    private Integer id;

    private LocalDateTime datetime;

    private String activity;

    private String description;

    private String module;

    private String entityId;

    private String entityName;

    private String entityRef;

    private String performedBy;

    private String role;

    private String severity;

    private String ipAddress;
}
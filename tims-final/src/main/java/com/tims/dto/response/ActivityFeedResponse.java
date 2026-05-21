package com.tims.dto.response;

import lombok.*;
import java.time.LocalDateTime;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ActivityFeedResponse {
    private Integer id;
    private String tankId;
    private String userFullName;
    private String activityType;
    private String title;
    private String detail;
    private LocalDateTime occurredAt;
}

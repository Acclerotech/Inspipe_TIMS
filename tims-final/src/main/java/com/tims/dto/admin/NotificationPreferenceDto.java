package com.tims.dto.admin;

import lombok.Builder;
import lombok.Value;

/**
 * DTO for GET /api/admin/notifications and PUT /api/admin/notifications.
 * channel: 'email' | 'in-app' | 'both'
 */
@Value
@Builder
public class NotificationPreferenceDto {
    String  key;
    String  label;
    String  description;
    boolean enabled;
    String  channel; // 'email' | 'in-app' | 'both'
}

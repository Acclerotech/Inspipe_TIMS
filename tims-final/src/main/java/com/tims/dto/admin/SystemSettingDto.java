package com.tims.dto.admin;

import lombok.Builder;
import lombok.Value;

/**
 * DTO for GET /api/admin/settings and PUT /api/admin/settings.
 * Maps 1-to-1 with the system_settings table and the frontend SystemSettingDto interface.
 */
@Value
@Builder
public class SystemSettingDto {
    String  key;
    String  label;
    String  value;
    String  description;
    boolean editable;
}

package com.tims.dto.admin;

import lombok.Builder;
import lombok.Value;

/**
 * DTO for GET /api/admin/integrations.
 * status: 'connected' | 'disconnected' | 'error'
 */
@Value
@Builder
public class IntegrationStatusDto {
    String id;
    String name;
    String description;
    String status;    // 'connected' | 'disconnected' | 'error'
    String lastSync;  // ISO-8601 or null
    String configUrl; // nullable
}

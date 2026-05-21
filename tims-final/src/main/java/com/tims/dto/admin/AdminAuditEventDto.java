package com.tims.dto.admin;

import lombok.Builder;
import lombok.Value;

/**
 * Response DTO for GET /api/admin/audit-log.
 *
 * Frontend expects: id, action (human-readable), user (email), time (formatted),
 * type ('upload'|'sign'|'alert'|'auth'|'config'|'reopen'), entityId (optional).
 *
 * The 'type' field is derived from AuditEvent.Action in AdminAuditService.
 */
@Value
@Builder
public class AdminAuditEventDto {
    Long   id;
    String action;   // human-readable description e.g. "SIGN on INSPECTION #42"
    String user;     // userEmail from AuditEvent
    String time;     // formatted occurredAt, e.g. "2024-05-09 14:32"
    String type;     // one of: upload | sign | alert | auth | config | reopen
    String entityId; // nullable
}

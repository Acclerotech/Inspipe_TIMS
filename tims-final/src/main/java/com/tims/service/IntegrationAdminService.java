package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditEventRepository;
import com.tims.dto.admin.AdminAuditEventDto;
import com.tims.dto.admin.IntegrationStatusDto;
import com.tims.entity.Integration;
import com.tims.repository.IntegrationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IntegrationAdminService {

    private static final DateTimeFormatter DT_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final IntegrationRepository  integrationRepository;
    private final AuditEventRepository   auditEventRepository;

    // ── Integrations ──────────────────────────────────────────────────────────

    public List<IntegrationStatusDto> listIntegrations() {
        return integrationRepository.findAll().stream()
                .map(this::toIntegrationDto)
                .toList();
    }

    // ── Global Admin Audit Log ────────────────────────────────────────────────

    /**
     * Returns a paginated list of ALL audit events (newest-first) mapped to
     * the AdminAuditEventDto shape the frontend expects.
     *
     * Re-uses the existing AuditEventRepository — no new repository needed.
     */
    public Page<AdminAuditEventDto> listAuditLog(Pageable pageable) {
        Page<AuditEvent> page = auditEventRepository.findAllByOrderByOccurredAtDesc(pageable);
        List<AdminAuditEventDto> dtos = page.getContent().stream()
                .map(this::toAuditDto)
                .toList();
        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private IntegrationStatusDto toIntegrationDto(Integration i) {
        return IntegrationStatusDto.builder()
                .id(i.getId())
                .name(i.getName())
                .description(i.getDescription())
                .status(i.getStatus())
                .lastSync(i.getLastSync() != null ? i.getLastSync().format(DT_FMT) : null)
                .configUrl(i.getConfigUrl())
                .build();
    }

    /**
     * Maps AuditEvent → AdminAuditEventDto.
     *
     * type derivation:
     *   SIGN | APPROVE          → "sign"
     *   REOPEN                  → "reopen"
     *   CREATE | COMMIT         → "upload"
     *   OVERRIDE                → "alert"
     *   DELETE                  → "auth"
     *   UPDATE | MODIFY | STATUS_CHANGE → "config"
     */
    private AdminAuditEventDto toAuditDto(AuditEvent e) {
        String type = switch (e.getAction()) {
            case SIGN, APPROVE          -> "sign";
            case REOPEN                 -> "reopen";
            case CREATE, COMMIT         -> "upload";
            case OVERRIDE               -> "alert";
            case DELETE                 -> "auth";
            default                     -> "config"; // UPDATE, MODIFY, STATUS_CHANGE
        };

        String action = e.getAction().name() + " on " + e.getEntityType()
                + (e.getEntityId() != null ? " #" + e.getEntityId() : "");

        return AdminAuditEventDto.builder()
                .id(e.getId())
                .action(action)
                .user(e.getUserEmail())
                .time(e.getOccurredAt() != null ? e.getOccurredAt().format(DT_FMT) : "")
                .type(type)
                .entityId(e.getEntityId())
                .build();
    }
}

package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.dto.admin.NotificationPreferenceDto;
import com.tims.entity.NotificationPreference;
import com.tims.exception.BusinessException;
import com.tims.repository.NotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationAdminService {

    private static final Set<String> VALID_CHANNELS = Set.of("email", "in-app", "both");

    private final NotificationPreferenceRepository notifRepository;
    private final AuditService                     auditService;

    public List<NotificationPreferenceDto> listAll() {
        return notifRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Bulk-replaces notification preferences.
     * Only known keys are persisted; unknown keys are skipped.
     */
    @Transactional
    public List<NotificationPreferenceDto> saveAll(List<NotificationPreferenceDto> updates) {
        if (updates == null || updates.isEmpty()) {
            throw new BusinessException("Notification preferences payload must not be empty");
        }

        var existing = notifRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(NotificationPreference::getKey, p -> p));

        for (NotificationPreferenceDto dto : updates) {
            NotificationPreference pref = existing.get(dto.getKey());
            if (pref == null) {
                log.warn("[ADMIN-NOTIF] Unknown key '{}' in bulk-save — skipped", dto.getKey());
                continue;
            }
            if (!VALID_CHANNELS.contains(dto.getChannel())) {
                throw new BusinessException(
                        "Invalid channel '" + dto.getChannel() + "' for key '" + dto.getKey() + "'");
            }

            boolean changed = pref.isEnabled() != dto.isEnabled()
                    || !pref.getChannel().equals(dto.getChannel());

            if (changed) {
                NotificationPreference before = clone(pref);
                pref.setEnabled(dto.isEnabled());
                pref.setChannel(dto.getChannel());
                notifRepository.save(pref);
                auditService.record("NOTIFICATION_PREF", dto.getKey(),
                        AuditEvent.Action.UPDATE, before, pref,
                        "Updated via admin panel");
                log.info("[ADMIN-NOTIF] '{}' → enabled={}, channel={}",
                        dto.getKey(), dto.isEnabled(), dto.getChannel());
            }
        }

        return listAll();
    }

    private NotificationPreferenceDto toDto(NotificationPreference p) {
        return NotificationPreferenceDto.builder()
                .key(p.getKey())
                .label(p.getLabel())
                .description(p.getDescription())
                .enabled(p.isEnabled())
                .channel(p.getChannel())
                .build();
    }

    private NotificationPreference clone(NotificationPreference p) {
        return NotificationPreference.builder()
                .key(p.getKey()).label(p.getLabel()).description(p.getDescription())
                .enabled(p.isEnabled()).channel(p.getChannel())
                .build();
    }
}

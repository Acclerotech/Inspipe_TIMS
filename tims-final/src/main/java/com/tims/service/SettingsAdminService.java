package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.dto.admin.SystemSettingDto;
import com.tims.entity.SystemSetting;
import com.tims.exception.BusinessException;
import com.tims.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettingsAdminService {

    private final SystemSettingRepository settingRepository;
    private final AuditService            auditService;

    public List<SystemSettingDto> listAll() {
        return settingRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Bulk-saves all editable settings from the request list.
     * Non-editable settings in the request are silently skipped to prevent overwrite.
     * Settings not present in the request are left unchanged.
     */
    @Transactional
    public List<SystemSettingDto> saveAll(List<SystemSettingDto> updates) {
        if (updates == null || updates.isEmpty()) {
            throw new BusinessException("Settings payload must not be empty");
        }

        // Load current DB state keyed by key
        var existing = settingRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(SystemSetting::getKey, s -> s));

        for (SystemSettingDto dto : updates) {
            SystemSetting setting = existing.get(dto.getKey());
            if (setting == null) {
                log.warn("[ADMIN-SETTINGS] Unknown key '{}' in bulk-save — skipped", dto.getKey());
                continue;
            }
            if (!setting.isEditable()) {
                log.warn("[ADMIN-SETTINGS] Read-only key '{}' in bulk-save — skipped", dto.getKey());
                continue;
            }
            if (!setting.getValue().equals(dto.getValue())) {
                String oldValue = setting.getValue();
                setting.setValue(dto.getValue());
                settingRepository.save(setting);
                auditService.record("SYSTEM_SETTING", dto.getKey(),
                        AuditEvent.Action.UPDATE, oldValue, dto.getValue(),
                        "Updated via admin panel");
                log.info("[ADMIN-SETTINGS] '{}' changed: '{}' → '{}'",
                        dto.getKey(), oldValue, dto.getValue());
            }
        }

        return listAll();
    }

    private SystemSettingDto toDto(SystemSetting s) {
        return SystemSettingDto.builder()
                .key(s.getKey())
                .label(s.getLabel())
                .value(s.getValue())
                .description(s.getDescription())
                .editable(s.isEditable())
                .build();
    }
}

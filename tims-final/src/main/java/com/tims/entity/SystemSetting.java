package com.tims.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Persisted system configuration entry.
 * Rows are seeded by V3__admin_module.sql; the Admin UI can update editable ones.
 */
@Entity
@Table(name = "system_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SystemSetting {

    @Id
    @Column(name = "`key`", length = 80)
    private String key;

    @Column(nullable = false, length = 150)
    private String label;

    @Column(nullable = false, length = 500)
    private String value;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false)
    private boolean editable;
}

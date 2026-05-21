package com.tims.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * System-wide notification preference entry.
 * Seeded by V3__admin_module.sql; admins can toggle enabled/channel at runtime.
 */
@Entity
@Table(name = "notification_preferences")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationPreference {

    @Id
    @Column(name = "`key`", length = 80)
    private String key;

    @Column(nullable = false, length = 150)
    private String label;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false)
    private boolean enabled;

    /** One of: email | in-app | both */
    @Column(nullable = false, length = 10)
    private String channel;
}

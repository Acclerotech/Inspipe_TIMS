package com.tims.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * External system integration record.
 * Seeded by V3__admin_module.sql. Status reflects real connectivity state.
 */
@Entity
@Table(name = "integrations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Integration {

    @Id
    @Column(length = 40)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 500)
    private String description;

    /** One of: connected | disconnected | error */
    @Column(nullable = false, length = 15)
    private String status;

    @Column(name = "last_sync")
    private LocalDateTime lastSync;

    @Column(name = "config_url", length = 500)
    private String configUrl;
}

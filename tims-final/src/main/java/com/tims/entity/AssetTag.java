package com.tims.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Tag label attached to an asset.
 *
 * References {@link Asset} (assets.id), NOT tanks.id directly.
 * Tags are created by the NewAsset wizard and stored in the asset_tags table.
 */
@Entity
@Table(name = "asset_tags")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * The asset this tag belongs to.
     * asset_tags.asset_id → assets.id
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Column(nullable = false, length = 80)
    private String tag;

    @Column(name = "added_at", nullable = false)
    private LocalDateTime addedAt;

    @PrePersist
    protected void onCreate() {
        if (addedAt == null) addedAt = LocalDateTime.now();
    }
}


package com.tims.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Extended asset detail collected by the NewAsset UI wizard.
 *
 * One Asset row per Tank. Core identity fields (tankId, site FK,
 * productService FK, riskCategory FK, operationalStatus) live on
 * the {@link Tank} entity — this table stores everything else.
 *
 * Relationship:  assets.tank_id  →  tanks.id  (OneToOne)
 *
 * NOTE: The tanks table is NOT altered. All new fields go here.
 */
@Entity
@Table(name = "assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * Back-reference to the Tank record.
     * assets.tank_id → tanks.id (UNIQUE — one Asset per Tank).
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tank_id", nullable = false, unique = true)
    private Tank tank;

    // ── Basic info ──────────────────────────────────────────────────────────

    @Column(name = "tank_name", length = 120)
    private String tankName;

    @Column(name = "asset_type", length = 60)
    private String assetType;

    @Column(name = "asset_category", length = 60)
    private String assetCategory;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // ── Dimension units ─────────────────────────────────────────────────────
    // (Actual dimension values — capacityM3, diameterM, heightM — stay on Tank)

    @Column(name = "capacity_unit", length = 10)
    private String capacityUnit;

    @Column(name = "diameter_unit", length = 10)
    private String diameterUnit;

    @Column(name = "height_unit", length = 10)
    private String heightUnit;

    // ── Construction ────────────────────────────────────────────────────────

    @Column(name = "material", length = 80)
    private String material;

    @Column(name = "construction_type", length = 40)
    private String constructionType;

    @Column(name = "bottom_type", length = 40)
    private String bottomType;

    @Column(name = "roof_type", length = 40)
    private String roofType;

    @Column(name = "shell_type", length = 40)
    private String shellType;

    @Column(name = "insulation", length = 60)
    private String insulation;

    // ── Design parameters ───────────────────────────────────────────────────

    @Column(name = "design_pressure", precision = 8, scale = 3)
    private BigDecimal designPressure;

    @Column(name = "design_pressure_unit", length = 10)
    private String designPressureUnit;

    @Column(name = "design_temp_min", precision = 7, scale = 2)
    private BigDecimal designTempMin;

    @Column(name = "design_temp_max", precision = 7, scale = 2)
    private BigDecimal designTempMax;

    // ── Location ────────────────────────────────────────────────────────────
    // Site FK lives on Tank. This column stores the free-text sub-plant field.

    /** UI "site" free-text field (sub-plant / plant area label). */
    @Column(name = "sub_plant", length = 120)
    private String subPlant;

    // ── Dates ───────────────────────────────────────────────────────────────

    @Column(name = "installation_date")
    private LocalDate installationDate;

    @Column(name = "commissioning_date")
    private LocalDate commissioningDate;

    // ── Additional ──────────────────────────────────────────────────────────

    @Column(name = "coating_system", columnDefinition = "TEXT")
    private String coatingSystem;

    @Column(name = "corrosion_allowance_mm", precision = 5, scale = 2)
    private BigDecimal corrosionAllowanceMm;

    @Column(name = "diagram_type", length = 20)
    private String diagramType;

    /**
     * Human-readable status label from the UI.
     * "Active" | "Inactive" | "Under Maintenance" | "Decommissioned"
     * Stored alongside the normalized Tank.OperationalStatus enum on Tank.
     */
    @Column(name = "status_label", length = 40)
    private String statusLabel;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // ── Audit ───────────────────────────────────────────────────────────────

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // ── Tags ────────────────────────────────────────────────────────────────

    @OneToMany(mappedBy = "asset", cascade = CascadeType.ALL,
            orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<AssetTag> tags = new ArrayList<>();

    // ── Lifecycle ───────────────────────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

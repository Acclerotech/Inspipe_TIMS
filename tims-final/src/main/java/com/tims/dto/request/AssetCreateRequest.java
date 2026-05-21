package com.tims.dto.request;

import lombok.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Request DTO for POST /api/assets
 *
 * Accepts the exact payload shape sent by NewAsset.tsx wizard.
 *
 * Changes vs original:
 *   + diameterUnit, heightUnit, designPressureUnit  (unit fields the UI sends)
 *   + insulation
 *   + coatingSystem
 *   + location  (site name for DB lookup — UI "location" dropdown)
 *   + @Size(max=10) on tankId to match VARCHAR(10) column
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetCreateRequest {

    // ── Required ────────────────────────────────────────────────────────────

    @NotBlank
    @Size(max = 10, message = "Tank ID must be 10 characters or fewer")
    private String tankId;

    @NotBlank
    private String status;          // "Active" | "Inactive" | "Under Maintenance" | "Decommissioned"

    // ── Basic info ──────────────────────────────────────────────────────────

    private String tankName;
    private String assetType;       // "Storage Tank" | "Process Tank" etc.
    private String assetCategory;   // "Crude Oil" | "Chemicals" etc.
    private String description;

    // ── Dimensions ─────────────────────────────────────────────────────────

    private BigDecimal capacity;
    private String    capacityUnit; // "m³" | "bbl" | "L" | "gal"

    private BigDecimal diameter;
    private String    diameterUnit; // "m" | "ft" | "mm"   ← NEW

    private BigDecimal height;
    private String    heightUnit;   // "m" | "ft" | "mm"   ← NEW

    // ── Construction ────────────────────────────────────────────────────────

    private String material;        // "Carbon Steel" | "Stainless Steel 304" etc.
    private String constructionType;// "Welded" | "Bolted" | "Riveted" | "Cast"
    private String bottomType;      // "Flat" | "Cone Down" | "Cone Up" etc.
    private String roofType;        // "Cone Roof" | "Floating Roof" etc.
    private String shellType;       // "Cylindrical" | "Rectangular" etc.
    private String insulation;      // "None" | "Mineral Wool" etc.  ← NEW

    // ── Design parameters ───────────────────────────────────────────────────

    private String     designCode;          // mapped to Tank.constructionCode
    private BigDecimal designPressure;
    private String     designPressureUnit;  // "barg" | "psig" | "kPa" | "MPa"  ← NEW
    private BigDecimal designTempMin;
    private BigDecimal designTempMax;

    // ── Location & service ──────────────────────────────────────────────────

    /**
     * Location dropdown value (Site.name for DB FK lookup).
     * UI field "location" → resolves to Site entity.
     */
    private String location;

    /**
     * Free-text sub-plant / plant area.
     * UI field "site" → stored in Tank.subPlant (NOT used for Site FK).
     */
    private String site;

    @NotBlank
    private String service;         // ProductService.name for DB FK lookup

    // ── Dates ───────────────────────────────────────────────────────────────

    private LocalDate installationDate;
    private LocalDate commissioningDate;

    // ── Additional ──────────────────────────────────────────────────────────

    private String     coatingSystem;       // ← NEW
    private BigDecimal corrosionAllowance;  // stored as corrosionAllowanceMm
    private String     notes;
    private List<String> tags;
    private String     diagramType;         // "vertical" | "horizontal" | "spherical" | "other"
}

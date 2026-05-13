package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.dto.request.AssetCreateRequest;
import com.tims.dto.response.DocumentResponse;
import com.tims.entity.*;
import com.tims.exception.BusinessException;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Service for the NewAsset wizard.
 *
 * Design:
 *   • Creates a minimal {@link Tank} record (core identity / FK fields).
 *   • Creates a separate {@link Asset} record with all extended UI fields.
 *   • The tanks table is NOT modified beyond inserting one new row per asset.
 *   • Tags are stored in asset_tags (FK → assets.id).
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AssetService {

    private final TankRepository            tankRepository;
    private final AssetRepository           assetRepository;
    private final AssetTagRepository        assetTagRepository;
    private final SiteRepository            siteRepository;
    private final ProductServiceRepository  productServiceRepository;
    private final RiskCategoryRepository    riskCategoryRepository;
    private final AuditService auditService;

    // ── Reference data (UI dropdowns) ────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<String> getLocations() {
        return siteRepository.findAll().stream()
                .map(Site::getName)
                .distinct()
                .sorted()
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> getCategories() {
        // Static list — no DB table needed
        return List.of(
                "Crude Oil", "Refined Products", "Chemicals",
                "Water", "Gas", "LPG", "Condensate", "Other"
        );
    }

    @Transactional(readOnly = true)
    public List<String> getServices() {
        return productServiceRepository.findAll().stream()
                .map(ProductService::getName)
                .sorted()
                .toList();
    }

    // ── Create asset ──────────────────────────────────────────────────────────

    /**
     * Creates a Tank (minimal core record) + Asset (extended detail record).
     *
     * @return business tankId string (e.g. "T-101")
     */
    public String createAsset(AssetCreateRequest req) {

        // 1. Uniqueness check on Tank business ID
        if (tankRepository.existsByTankId(req.getTankId())) {
            throw new BusinessException("Tank ID already exists: " + req.getTankId());
        }

        // 2. Resolve Site from location dropdown value
        String siteName = req.getLocation() != null ? req.getLocation() : req.getSite();
        Site site = siteRepository.findByName(siteName)
                .orElseThrow(() -> new ResourceNotFoundException("Site", siteName));

        // 3. Resolve ProductService
        ProductService productService = productServiceRepository.findByName(req.getService())
                .orElseThrow(() -> new ResourceNotFoundException("ProductService", req.getService()));

        // 4. Default risk category (lowest tier)
        RiskCategory defaultRisk = riskCategoryRepository.findAll().stream()
                .min(Comparator.comparing(RiskCategory::getCode))
                .orElseThrow(() -> new BusinessException(
                        "No risk categories configured — add at least one row to risk_categories"));

        // 5. Map status string → OperationalStatus enum
        Tank.OperationalStatus opStatus = mapStatus(req.getStatus());

        // ── Step A: Create minimal Tank record ────────────────────────────────
        // Only the columns that already exist on the tanks table are set here.
        // No new columns are added to tanks.
        Tank tank = Tank.builder()
                .tankId(req.getTankId())
                .site(site)
                .productService(productService)
                .riskCategory(defaultRisk)
                .operationalStatus(opStatus)
                .complianceStatus(Tank.ComplianceStatus.COMPLIANT)
                // Dimensions go on Tank because capacity_m3/diameter_m/height_m already exist
                .capacityM3(req.getCapacity())
                .diameterM(req.getDiameter())
                .heightM(req.getHeight())
                // designCode maps to the existing construction_code column
                .constructionCode(req.getDesignCode())
                .build();

        Tank savedTank = tankRepository.save(tank);

        // ── Step B: Create Asset record with all extended fields ──────────────
        Asset asset = Asset.builder()
                .tank(savedTank)
                // Basic info
                .tankName(req.getTankName())
                .assetType(req.getAssetType())
                .assetCategory(req.getAssetCategory())
                .description(req.getDescription())
                .statusLabel(req.getStatus())
                // Dimension units
                .capacityUnit(req.getCapacityUnit())
                .diameterUnit(req.getDiameterUnit())
                .heightUnit(req.getHeightUnit())
                // Construction
                .material(req.getMaterial())
                .constructionType(req.getConstructionType())
                .bottomType(req.getBottomType())
                .roofType(req.getRoofType())
                .shellType(req.getShellType())
                .insulation(req.getInsulation())
                // Design parameters
                .designPressure(req.getDesignPressure())
                .designPressureUnit(req.getDesignPressureUnit())
                .designTempMin(req.getDesignTempMin())
                .designTempMax(req.getDesignTempMax())
                // Location
                .subPlant(req.getSite())          // UI "site" free-text → sub_plant column
                // Dates
                .installationDate(req.getInstallationDate())
                .commissioningDate(req.getCommissioningDate())
                // Additional
                .coatingSystem(req.getCoatingSystem())
                .corrosionAllowanceMm(req.getCorrosionAllowance())
                .notes(req.getNotes())
                .diagramType(req.getDiagramType())
                .build();

        Asset savedAsset = assetRepository.save(asset);

        // ── Step C: Save tags (FK → assets.id) ───────────────────────────────
        if (req.getTags() != null && !req.getTags().isEmpty()) {
            req.getTags().forEach(tagStr ->
                    assetTagRepository.save(
                            AssetTag.builder()
                                    .asset(savedAsset)
                                    .tag(tagStr)
                                    .build()
                    )
            );
        }

        // ── Step D: Audit record ──────────────────────────────────────────────
        auditService.record(
                "ASSET",
                savedTank.getId().toString(),
                AuditEvent.Action.CREATE,
                null,
                Map.of("tankId", savedTank.getTankId(), "site", site.getName())
        );

        log.info("Asset created: tankId={} assetId={}", savedTank.getTankId(), savedAsset.getId());
        return savedTank.getTankId();
    }

    // ── Image upload (Phase 2) ────────────────────────────────────────────────

    public DocumentResponse uploadImage(String tankId, MultipartFile file) {
        Asset asset = assetRepository.findByTankId(tankId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", tankId));
        // TODO: delegate to existing DocumentService / file-storage pattern
        throw new UnsupportedOperationException("Image upload — Phase 2 not yet implemented");
    }

    // ── Status mapper ─────────────────────────────────────────────────────────

    private Tank.OperationalStatus mapStatus(String uiStatus) {
        if (uiStatus == null) return Tank.OperationalStatus.IN_SERVICE;
        return switch (uiStatus) {
            case "Active"            -> Tank.OperationalStatus.IN_SERVICE;
            case "Inactive"          -> Tank.OperationalStatus.OUT_OF_SERVICE;
            case "Under Maintenance" -> Tank.OperationalStatus.OUT_OF_SERVICE;
            case "Decommissioned"    -> Tank.OperationalStatus.DECOMMISSIONED;
            default                  -> Tank.OperationalStatus.IN_SERVICE;
        };
    }
}

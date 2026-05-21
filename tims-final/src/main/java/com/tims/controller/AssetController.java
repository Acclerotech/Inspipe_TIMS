package com.tims.controller;

import com.tims.dto.request.AssetCreateRequest;
import com.tims.dto.response.DocumentResponse;
import com.tims.service.AssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * REST endpoints for the NewAsset UI wizard.
 *
 * Endpoints:
 *   GET  /api/assets/locations   → dropdown values
 *   GET  /api/assets/categories  → dropdown values
 *   GET  /api/assets/services    → dropdown values
 *   POST /api/assets             → create new asset
 *   POST /api/assets/{id}/image  → upload tank image (Phase 2)
 */
@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
@Tag(name = "Assets")
@SecurityRequirement(name = "bearerAuth")
public class AssetController {

    private final AssetService assetService;

    // ── Reference data for UI dropdowns ───────────────────────────────────────
    @GetMapping
    @Operation(summary = "Get assets list for dropdowns and tables")
    public ResponseEntity<Map<String, Object>> getAssets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "200") int size
    ) {
        return ResponseEntity.ok(assetService.getAssets(page, size));
    }
    /**
     * Location dropdown — returns distinct site names.
     * Maps to GET /assets/locations called on mount.
     * staleTime=5min on frontend → cached aggressively.
     */
    @GetMapping("/locations")
    @Operation(summary = "Distinct site/location names for NewAsset location dropdown")
    public ResponseEntity<List<String>> getLocations() {
        return ResponseEntity.ok(assetService.getLocations());
    }

    /**
     * Category dropdown — returns static asset category list.
     * No DB table required.
     */
    @GetMapping("/categories")
    @Operation(summary = "Asset category options for NewAsset category dropdown")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(assetService.getCategories());
    }

    /**
     * Service dropdown — returns ProductService names from DB.
     */
    @GetMapping("/services")
    @Operation(summary = "Product/service names for NewAsset service dropdown")
    public ResponseEntity<List<String>> getServices() {
        return ResponseEntity.ok(assetService.getServices());
    }

    // ── Asset creation ────────────────────────────────────────────────────────

    /**
     * Create a new tank/asset from the NewAsset wizard.
     *
     * Request shape (from NewAsset.tsx mutationFn payload):
     *   tankId, tankName, assetType, assetCategory, status, description,
     *   capacity (+unit), diameter (+unit), height (+unit),
     *   material, constructionType, bottomType, roofType, shellType, insulation,
     *   designCode, designPressure (+unit), designTempMin, designTempMax,
     *   location, site, service,
     *   installationDate, commissioningDate,
     *   coatingSystem, corrosionAllowance, notes, tags[], diagramType
     *
     * Response: { "id": "T-101" }   ← business tankId string
     *
     * On success, frontend:
     *   - invalidates ['dashboard'] and ['assets'] React Query keys
     *   - navigates to /assets
     */
    @PostMapping
    @Operation(summary = "Create new asset — NewAsset wizard final step")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER','INTEGRITY_ENGINEER')")
    public ResponseEntity<Map<String, String>> createAsset(
            @Valid @RequestBody AssetCreateRequest req) {
        String tankId = assetService.createAsset(req);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("id", tankId));
    }

    // ── Image upload (Phase 2) ────────────────────────────────────────────────

    /**
     * Upload a tank image or diagram.
     * Called as a follow-up after POST /assets when imageFile is present.
     *
     * Frontend should call this in the createMutation.onSuccess callback:
     *   if (form.imageFile) {
     *     const fd = new FormData();
     *     fd.append('file', form.imageFile);
     *     await fetch(`/api/assets/${data.id}/image`, {
     *       method: 'POST',
     *       headers: { Authorization: `Bearer ${token}` },
     *       body: fd
     *     });
     *   }
     *
     * Supported: JPG, PNG, PDF. Max 10MB.
     */
    @PostMapping(value = "/{tankId}/image", consumes = "multipart/form-data")
    @Operation(summary = "Upload tank image or diagram (JPG, PNG, PDF — max 10MB)")
    @PreAuthorize("hasAnyRole('ADMIN','INTEGRITY_MANAGER','INTEGRITY_ENGINEER')")
    public ResponseEntity<DocumentResponse> uploadImage(
            @PathVariable String tankId,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(assetService.uploadImage(tankId, file));
    }
}

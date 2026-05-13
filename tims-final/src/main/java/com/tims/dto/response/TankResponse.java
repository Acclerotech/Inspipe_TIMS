package com.tims.dto.response;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TankResponse {
    private Short id;
    private String tankId;
    private String siteName;
    private String siteCountry;
    private String productService;
    private String riskCategory;
    private String riskCategoryColor;
    private String constructionCode;
    private BigDecimal diameterM;
    private BigDecimal heightM;
    private BigDecimal capacityM3;
    private Short yearBuilt;
    private String foundationType;
    private Byte criticalityTier;
    private String operationalStatus;
    private String complianceStatus;
    private LocalDateTime lastUpdatedAt;
    private LocalDateTime createdAt;
}

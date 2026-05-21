package com.tims.entity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity @Table(name="tanks")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Tank {
    public enum OperationalStatus { IN_SERVICE, OUT_OF_SERVICE, DECOMMISSIONED }
    public enum ComplianceStatus { COMPLIANT, ACTION_REQUIRED, OVERDUE }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Short id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="site_id",nullable=false) private Site site;
    @Column(name="tank_id",nullable=false,unique=true,length=10) private String tankId;;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="product_service_id",nullable=false) private ProductService productService;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="risk_category_id",nullable=false) private RiskCategory riskCategory;
    @Column(name="construction_code",length=40) private String constructionCode;
    @Column(name="diameter_m",precision=6,scale=2) private BigDecimal diameterM;
    @Column(name="height_m",precision=6,scale=2) private BigDecimal heightM;
    @Column(name="capacity_m3",precision=10,scale=2) private BigDecimal capacityM3;
    @Column(name="year_built") private Short yearBuilt;
    @Column(name="foundation_type",length=80) private String foundationType;
    @Column(name="criticality_tier") private Byte criticalityTier;
    @Enumerated(EnumType.STRING) @Column(name="operational_status",nullable=false,length=20) private OperationalStatus operationalStatus;
    @Enumerated(EnumType.STRING) @Column(name="compliance_status",nullable=false,length=20) private ComplianceStatus complianceStatus;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="last_updated_by") private User lastUpdatedBy;
    @Column(name="last_updated_at") private LocalDateTime lastUpdatedAt;
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { createdAt=LocalDateTime.now(); lastUpdatedAt=LocalDateTime.now(); }
    @PreUpdate protected void onUpdate() { lastUpdatedAt=LocalDateTime.now(); }
}

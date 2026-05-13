package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Entity @Table(name="corrosion_assessments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CorrosionAssessment {
    public enum CoatingCondition { GOOD, FAIR, POOR, FAILED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id",nullable=false) private Tank tank;
    @Column(name="assessment_date",nullable=false) private LocalDate assessmentDate;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="standard_id",nullable=false) private ComplianceStandard standard;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="assessed_by",nullable=false) private User assessedBy;
    @Column(name="shell_remaining_life_yr",precision=6,scale=2) private BigDecimal shellRemainingLifeYr;
    @Column(name="shell_corr_rate_mm_yr",precision=6,scale=4) private BigDecimal shellCorrRateMmYr;
    @Column(name="shell_min_thickness_mm",precision=6,scale=3) private BigDecimal shellMinThicknessMm;
    @Column(name="shell_retirement_mm",precision=6,scale=3) private BigDecimal shellRetirementMm;
    @Column(name="floor_remaining_life_yr",precision=6,scale=2) private BigDecimal floorRemainingLifeYr;
    @Column(name="floor_corr_rate_mm_yr",precision=6,scale=4) private BigDecimal floorCorrRateMmYr;
    @Column(name="roof_remaining_life_yr",precision=6,scale=2) private BigDecimal roofRemainingLifeYr;
    @Column(name="overall_remaining_life_yr",precision=6,scale=2) private BigDecimal overallRemainingLifeYr;
    @Column(name="k_factor",precision=4,scale=2) private BigDecimal kFactor;
    @Column(name="next_inspection_due") private LocalDate nextInspectionDue;
    @Column(name="settlement_max_mm",precision=7,scale=2) private BigDecimal settlementMaxMm;
    @Enumerated(EnumType.STRING) @Column(name="coating_condition",length=10) private CoatingCondition coatingCondition;
    @Column(columnDefinition="TEXT") private String notes;
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { if(createdAt==null) createdAt=LocalDateTime.now(); }
}

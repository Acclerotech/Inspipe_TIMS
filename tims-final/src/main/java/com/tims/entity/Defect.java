package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Entity @Table(name="defects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Defect {
    public enum Component { SHELL, FLOOR, ROOF, NOZZLE, FOUNDATION }
    public enum Status { OPEN, CLOSED, MONITOR }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id",nullable=false) private Tank tank;
    @Column(name="defect_code",nullable=false,unique=true,length=20) private String defectCode;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=15) private Component component;
    @Column(name="defect_type",nullable=false,length=60) private String defectType;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="defect_class_id",nullable=false) private DefectClass defectClass;
    @Column(name="location_description",length=100) private String locationDescription;
    @Column(name="plate_id",length=20) private String plateId;
    @Column(name="radius_m",precision=7,scale=3) private BigDecimal radiusM;
    @Column(name="angle_deg",precision=6,scale=2) private BigDecimal angleDeg;
    @Column(name="height_m",precision=6,scale=3) private BigDecimal heightM;
    @Column(name="max_loss_pct",precision=5,scale=2) private BigDecimal maxLossPct;
    @Column(name="wall_loss_mm",precision=6,scale=3) private BigDecimal wallLossMm;
    @Column(name="nominal_mm",precision=6,scale=3) private BigDecimal nominalMm;
    @Column(name="growth_rate_mm_yr",precision=6,scale=3) private BigDecimal growthRateMmYr;
    @Column(name="remaining_life_yr",precision=5,scale=2) private BigDecimal remainingLifeYr;
    @Column(name="first_detected_date",nullable=false) private LocalDate firstDetectedDate;
    @Column(name="last_observed_date") private LocalDate lastObservedDate;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=10) private Status status;
    @Column(length=80) private String disposition;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="linked_job_id") private IngestionJob linkedJob;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="detected_by") private User detectedBy;
    @Column(columnDefinition="TEXT") private String notes;
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { if(createdAt==null) createdAt=LocalDateTime.now(); if(status==null) status=Status.OPEN; }
}

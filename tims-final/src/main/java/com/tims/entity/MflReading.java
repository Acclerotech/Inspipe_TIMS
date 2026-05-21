package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity @Table(name="mfl_readings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MflReading {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="job_id",nullable=false) private IngestionJob job;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id",nullable=false) private Tank tank;
    @Column(name="plate_id",length=20) private String plateId;
    @Column(name="radius_m",precision=7,scale=3) private BigDecimal radiusM;
    @Column(name="angle_deg",precision=6,scale=2) private BigDecimal angleDeg;
    @Column(name="wall_loss_pct",precision=5,scale=2) private BigDecimal wallLossPct;
    @Column(name="wall_loss_mm",precision=6,scale=3) private BigDecimal wallLossMm;
    @Column(name="nominal_mm",precision=6,scale=3) private BigDecimal nominalMm;
    @Column(name="measured_at",nullable=false) private LocalDateTime measuredAt;
    @PrePersist protected void onCreate() { if(measuredAt==null) measuredAt=LocalDateTime.now(); }
}

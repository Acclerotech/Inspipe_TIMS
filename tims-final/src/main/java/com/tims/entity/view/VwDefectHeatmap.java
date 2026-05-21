package com.tims.entity.view;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;
import java.math.BigDecimal;
import java.time.LocalDate;
@Entity @Immutable @Table(name="vw_defect_heatmap")
@Getter @NoArgsConstructor
public class VwDefectHeatmap {
    @Id @Column(name="defect_code") private String defectCode;
    @Column(name="tank_id") private String tankId;
    @Column(name="component") private String component;
    @Column(name="defect_type") private String defectType;
    //@Column(name="severity") private String severity;
    @Column(name="class_num") private Byte classNum;
    @Column(name="plate_id") private String plateId;
    @Column(name="radius_m") private BigDecimal radiusM;
    @Column(name="angle_deg") private BigDecimal angleDeg;
    @Column(name="max_loss_pct") private BigDecimal maxLossPct;
    @Column(name="wall_loss_mm") private BigDecimal wallLossMm;
    @Column(name="growth_rate_mm_yr") private BigDecimal growthRateMmYr;
    @Column(name="disposition") private String disposition;
    @Column(name="status") private String status;
    @Column(name="first_detected_date") private LocalDate firstDetectedDate;
    @Column(name="last_observed_date") private LocalDate lastObservedDate;
}

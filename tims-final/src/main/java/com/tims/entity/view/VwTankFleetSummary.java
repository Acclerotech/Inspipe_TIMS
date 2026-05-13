package com.tims.entity.view;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;
import java.math.BigDecimal;
import java.time.LocalDate;
@Entity @Immutable @Table(name="vw_tank_fleet_summary")
@Getter @NoArgsConstructor
public class VwTankFleetSummary {
    @Id @Column(name="tank_id") private String tankId;
    @Column(name="site_name") private String siteName;
    @Column(name="service") private String service;
    @Column(name="risk_category") private String riskCategory;
    @Column(name="compliance_status") private String complianceStatus;
    @Column(name="remaining_life_yr") private BigDecimal remainingLifeYr;
    @Column(name="corrosion_rate") private BigDecimal corrosionRate;
    @Column(name="next_inspection_due") private LocalDate nextInspectionDue;
    @Column(name="last_inspection_date") private LocalDate lastInspectionDate;
    @Column(name="last_inspection_type") private String lastInspectionType;
    @Column(name="open_defects") private Long openDefects;
}

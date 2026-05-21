package com.tims.entity.view;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;
import java.time.LocalDate;
@Entity @Immutable @Table(name="vw_inspection_calendar")
@Getter @NoArgsConstructor
public class VwInspectionCalendar {
    @Id @Column(name="inspection_id") private Integer inspectionId;
    @Column(name="tank_id") private String tankId;
    @Column(name="site_name") private String siteName;
    @Column(name="risk_category") private String riskCategory;
    @Column(name="inspection_type") private String inspectionType;
    @Column(name="color_hex") private String colorHex;
    @Column(name="week_number") private Short weekNumber;
    @Column(name="planned_date") private LocalDate plannedDate;
    @Column(name="actual_date") private LocalDate actualDate;
    @Column(name="status") private String status;
    @Column(name="inspector_name") private String inspectorName;
}

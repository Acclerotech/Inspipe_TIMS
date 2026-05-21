package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity @Table(name="ut_readings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UtReading {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="job_id",nullable=false) private IngestionJob job;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id",nullable=false) private Tank tank;
    @Column(name="reading_id",nullable=false,length=20) private String readingId;
    @Column(name="shell_course") private Short shellCourse;
    @Column(name="angle_deg",precision=6,scale=2) private BigDecimal angleDeg;
    @Column(name="height_mm",precision=8,scale=2) private BigDecimal heightMm;
    @Column(name="thickness_mm",nullable=false,precision=6,scale=3) private BigDecimal thicknessMm;
    @Column(name="nominal_mm",precision=6,scale=3) private BigDecimal nominalMm;
    @Column(length=20) private String probe;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="inspector_id") private User inspector;
    @Column(name="temp_c",precision=5,scale=2) private BigDecimal tempC;
    @Column(name="is_below_retirement",nullable=false) private boolean belowRetirement;
    @Column(name="measured_at",nullable=false) private LocalDateTime measuredAt;
    @PrePersist protected void onCreate() { if(measuredAt==null) measuredAt=LocalDateTime.now(); }
}

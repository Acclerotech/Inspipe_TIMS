package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
@Entity @Table(name="thickness_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ThicknessHistory {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id",nullable=false) private Tank tank;
    @Column(name="measurement_year",nullable=false) private Short measurementYear;
    @Column(name="avg_thickness_mm",nullable=false,precision=6,scale=3) private BigDecimal avgThicknessMm;
    @Column(name="min_thickness_mm",nullable=false,precision=6,scale=3) private BigDecimal minThicknessMm;
    @Column(name="shell_course",nullable=true) private Short shellCourse;
    @Column(name="component", nullable=false, length=20)
    private String component; // "SHELL", "FLOOR", "ROOF", "NOZZLE", "FOUNDATION"
    @Column(length=60) private String source;
}

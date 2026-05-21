package com.tims.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "staging_ut_readings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StagingUtReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ============================================================
    // FK REFERENCES
    // ============================================================

    @Column(name = "job_id", nullable = false)
    private Integer jobId;

    // FIXED
    // matches Tank.id type
    @Column(name = "tank_id", nullable = false)
    private String tankId;

    // ============================================================
    // READING INFO
    // ============================================================

    @Column(name = "reading_id",
            nullable = false,
            length = 50)
    private String readingId;

    @Column(name = "shell_course")
    private Short shellCourse;

    @Column(name = "angle_deg",
            precision = 6,
            scale = 2)
    private BigDecimal angleDeg;

    @Column(name = "height_mm",
            precision = 8,
            scale = 2)
    private BigDecimal heightMm;

    @Column(name = "thickness_mm",
            nullable = false,
            precision = 6,
            scale = 3)
    private BigDecimal thicknessMm;

    @Column(name = "nominal_mm",
            precision = 6,
            scale = 3)
    private BigDecimal nominalMm;

    @Column(length = 20)
    private String probe;

    @Column(name = "inspector_id")
    private Integer inspectorId;

    @Column(name = "temp_c",
            precision = 5,
            scale = 2)
    private BigDecimal tempC;

    // ============================================================
    // VALIDATION FLAGS
    // ============================================================

    @Column(name = "is_below_retirement",
            nullable = false)
    private boolean belowRetirement;

    // ============================================================
    // AUDIT
    // ============================================================

    @Column(name = "measured_at",
            nullable = false,
            updatable = false)
    private LocalDateTime measuredAt;

    @PrePersist
    protected void onCreate() {

        if (measuredAt == null) {
            measuredAt = LocalDateTime.now();
        }
    }
}
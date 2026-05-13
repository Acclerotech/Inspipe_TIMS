package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity @Table(name="corrosion_overrides",
    indexes=@Index(name="idx_co_tank",columnList="tank_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CorrosionOverride {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id",nullable=false) private Tank tank;
    @Column(name="default_allowance_mm",nullable=false,precision=6,scale=3) private BigDecimal defaultAllowanceMm;
    @Column(name="override_allowance_mm",nullable=false,precision=6,scale=3) private BigDecimal overrideAllowanceMm;
    @Column(nullable=false,length=500) private String reason;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="overridden_by",nullable=false) private User overriddenBy;
    @Column(name="overridden_at",nullable=false) private LocalDateTime overriddenAt;
    @Column(name="is_active",nullable=false) private boolean active;
    @PrePersist protected void onCreate() { if(overriddenAt==null) overriddenAt=LocalDateTime.now(); active=true; }
}

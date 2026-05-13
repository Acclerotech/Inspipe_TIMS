package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity @Table(name="sites")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Site {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Short id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="org_id",nullable=false) private Organisation organisation;
    @Column(nullable=false,length=100) private String name;
    @Column(nullable=false,length=50) private String country;
    @Column(length=50) private String city;
    @Column(precision=9,scale=6) private BigDecimal latitude;
    @Column(precision=9,scale=6) private BigDecimal longitude;
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { if(createdAt==null) createdAt=LocalDateTime.now(); }
}

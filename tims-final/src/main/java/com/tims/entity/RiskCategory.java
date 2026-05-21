package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="risk_categories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RiskCategory {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Short id;
    @Column(nullable=false,unique=true,length=10) private String code;
    @Column(nullable=false,length=30) private String label;
    @Column(name="color_hex",nullable=false,length=7) private String colorHex;
}

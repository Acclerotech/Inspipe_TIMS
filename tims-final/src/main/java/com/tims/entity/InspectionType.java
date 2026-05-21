package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="inspection_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InspectionType {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Byte id;
    @Column(nullable=false,unique=true,length=20) private String code;
    @Column(nullable=false,length=40) private String label;
    @Column(name="color_hex",nullable=false,length=7) private String colorHex;
}

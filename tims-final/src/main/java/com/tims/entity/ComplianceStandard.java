package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="compliance_standards")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComplianceStandard {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Short id;
    @Column(nullable=false,unique=true,length=30) private String code;
    @Column(nullable=false,length=80) private String label;
    @Column(nullable=false,length=10) private String edition;
}

package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="report_templates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReportTemplate {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Byte id;
    @Column(nullable=false,unique=true,length=30) private String code;
    @Column(nullable=false,length=60) private String label;
    @Column(name="standard_ref",length=30) private String standardRef;
}

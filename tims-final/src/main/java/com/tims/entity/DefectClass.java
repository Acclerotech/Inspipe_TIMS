package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="defect_classes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DefectClass {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Byte id;
    @Column(name="class_num",nullable=false,unique=true) private Byte classNum;
    @Column(nullable=false,length=20) private String label;
    @Column(columnDefinition="TEXT") private String description;
}

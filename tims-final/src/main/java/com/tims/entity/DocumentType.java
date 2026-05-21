package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="document_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DocumentType {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Byte id;
    @Column(nullable=false,unique=true,length=10) private String code;
    @Column(nullable=false,length=20) private String label;
}

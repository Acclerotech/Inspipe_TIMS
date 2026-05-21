package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="organisations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Organisation {
    public enum Type { OPERATOR, INSPECTOR, CONTRACTOR }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Short id;
    @Column(nullable=false,length=100) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Type type;
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { if(createdAt==null) createdAt=LocalDateTime.now(); }
}

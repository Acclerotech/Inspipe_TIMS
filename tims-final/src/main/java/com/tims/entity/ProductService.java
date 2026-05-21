package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="product_services")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductService {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Short id;
    @Column(nullable=false,length=60) private String name;
    @Column(name="hazard_class",length=10) private String hazardClass;
}

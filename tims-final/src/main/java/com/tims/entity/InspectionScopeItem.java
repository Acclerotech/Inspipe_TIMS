package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="inspection_scope_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InspectionScopeItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="inspection_id",nullable=false) private Inspection inspection;
    @Column(name="scope_item",nullable=false,length=100) private String scopeItem;
    @Column(name="is_completed",nullable=false) private boolean completed;
}

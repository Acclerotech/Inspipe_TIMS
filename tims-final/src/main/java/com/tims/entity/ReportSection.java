package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="report_sections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReportSection {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="report_id",nullable=false) private ComplianceReport report;
    @Column(name="section_name",nullable=false,length=100) private String sectionName;
    @Column(name="is_included",nullable=false) private boolean included;
    @Column(name="sort_order",nullable=false) private Byte sortOrder;
}

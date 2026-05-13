package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="compliance_reports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComplianceReport {
    public enum Status { DRAFT, UNDER_REVIEW, SIGNED, PUBLISHED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id",nullable=false) private Tank tank;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="template_id",nullable=false) private ReportTemplate template;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="standard_id",nullable=false) private ComplianceStandard standard;
    @Column(name="report_ref",nullable=false,unique=true,length=30) private String reportRef;
    @Column(name="inspection_date",nullable=false) private LocalDate inspectionDate;
    @Column(nullable=false,length=20) private String units;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Status status;
    @Column(name="generated_at",nullable=false) private LocalDateTime generatedAt;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="generated_by",nullable=false) private User generatedBy;
    @OneToMany(mappedBy="report",cascade=CascadeType.ALL,orphanRemoval=true)
    @Builder.Default private List<ReportSection> sections = new ArrayList<>();
    @OneToMany(mappedBy="report",cascade=CascadeType.ALL,orphanRemoval=true)
    @Builder.Default private List<ReportSignatory> signatories = new ArrayList<>();
    @PrePersist protected void onCreate() {
        if(generatedAt==null) generatedAt=LocalDateTime.now();
        if(status==null) status=Status.DRAFT;
        if(units==null) units="mm, mm/yr";
    }
}

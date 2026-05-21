package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="inspections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Inspection {
    public enum Status { PLANNED, IN_PROGRESS, COMPLETED, APPROVED, REOPENED, CANCELLED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @Version private Integer version;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id",nullable=false) private Tank tank;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="inspection_type_id",nullable=false) private InspectionType inspectionType;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="standard_id",nullable=false) private ComplianceStandard standard;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="inspector_id",nullable=false) private User inspector;
    @Column(name="planned_date") private LocalDate plannedDate;
    @Column(name="actual_date") private LocalDate actualDate;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Status status;
    @Column(name="week_number") private Short weekNumber;
    @Column(name="interval_years",precision=4,scale=1) private BigDecimal intervalYears;
    @Column(name="interval_basis",length=80) private String intervalBasis;
    @Column(columnDefinition="TEXT") private String notes;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="approved_by") private User approvedBy;
    @Column(name="approved_at") private LocalDateTime approvedAt;
    @Column(name="reopen_reason",length=500) private String reopenReason;
    @Column(name="reopen_count") @Builder.Default private Integer reopenCount = 0;
    @Column(name="reopened_by_email",length=120) private String reopenedByEmail;
    @Column(name="reopened_at") private LocalDateTime reopenedAt;
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @OneToMany(mappedBy="inspection",cascade=CascadeType.ALL,orphanRemoval=true)
    @Builder.Default private List<InspectionScopeItem> scopeItems = new ArrayList<>();
    @PrePersist protected void onCreate() {
        if(createdAt==null) createdAt=LocalDateTime.now();
        if(status==null) status=Status.PLANNED;
        if(reopenCount==null) reopenCount=0;
    }
}

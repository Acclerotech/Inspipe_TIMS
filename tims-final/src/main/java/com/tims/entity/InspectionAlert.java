package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Entity @Table(name="inspection_alerts",
    indexes=@Index(name="idx_ia_user_unread",columnList="assigned_to,is_read"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InspectionAlert {
    public enum AlertType { CONFLICT, OVERDUE, RETIREMENT_APPROACHING,ACTION_REQUIRED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id",nullable=false) private Tank tank;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="inspection_id") private Inspection inspection;
    @Enumerated(EnumType.STRING) @Column(name="alert_type",nullable=false,length=30) private AlertType alertType;
    @Column(nullable=false,length=200) private String message;
    @Column(name="proposed_date") private LocalDate proposedDate;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="assigned_to",nullable=false) private User assignedTo;
    @Column(name="is_read",nullable=false) private boolean read;
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @Column(name="acknowledged_at") private LocalDateTime acknowledgedAt;
    @PrePersist protected void onCreate() { if(createdAt==null) createdAt=LocalDateTime.now(); read=false; }
}

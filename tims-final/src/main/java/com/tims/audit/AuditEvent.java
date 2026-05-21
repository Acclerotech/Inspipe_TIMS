package com.tims.audit;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="audit_events",
    indexes={@Index(name="idx_audit_entity",columnList="entity_type,entity_id"),
             @Index(name="idx_audit_user",columnList="user_id"),
             @Index(name="idx_audit_ts",columnList="occurred_at")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditEvent {
    public enum Action { CREATE, UPDATE, DELETE, STATUS_CHANGE, REOPEN, OVERRIDE, COMMIT, SIGN, APPROVE ,MODIFY,}
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="entity_type",nullable=false,length=40) private String entityType;
    @Column(name="entity_id",nullable=false,length=40) private String entityId;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Action action;
    @Column(name="before_state",columnDefinition="TEXT") private String beforeState;
    @Column(name="after_state",columnDefinition="TEXT") private String afterState;
    @Column(name="user_id",nullable=false) private Short userId;
    @Column(name="user_email",nullable=false,length=120) private String userEmail;
    @Column(length=500) private String reason;
    @Column(name="occurred_at",nullable=false,updatable=false) private LocalDateTime occurredAt;
    @PrePersist protected void onCreate() { if(occurredAt==null) occurredAt=LocalDateTime.now(); }
}

package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="activity_feed")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActivityFeed {
    public enum ActivityType { UPLOAD, ASSESSMENT, IMPORT, REPORT, INSPECTION, DEFECT }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id") private Tank tank;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false) private User user;
    @Enumerated(EnumType.STRING) @Column(name="activity_type",nullable=false,length=20) private ActivityType activityType;
    @Column(nullable=false,length=120) private String title;
    @Column(length=200) private String detail;
    @Column(name="occurred_at",nullable=false) private LocalDateTime occurredAt;
    @PrePersist protected void onCreate() { if(occurredAt==null) occurredAt=LocalDateTime.now(); }
}

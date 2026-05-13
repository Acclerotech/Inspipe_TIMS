package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="report_signatories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReportSignatory {
    public enum Role { AUTHOR, REVIEWER, APPROVER }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="report_id",nullable=false) private ComplianceReport report;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false) private User user;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=15) private Role role;
    @Column(name="signed_at") private LocalDateTime signedAt;
}

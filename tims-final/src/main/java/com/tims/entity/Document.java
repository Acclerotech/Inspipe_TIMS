package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Document {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id") private Tank tank;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="report_id") private ComplianceReport report;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="doc_type_id",nullable=false) private DocumentType docType;
    @Column(nullable=false,length=120) private String title;
    @Column(nullable=false,length=255) private String filename;
    @Column(length=10) private String version;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="uploaded_by",nullable=false) private User uploadedBy;
    @Column(name="uploaded_at",nullable=false) private LocalDateTime uploadedAt;
    @PrePersist protected void onCreate() { if(uploadedAt==null) uploadedAt=LocalDateTime.now(); }
}

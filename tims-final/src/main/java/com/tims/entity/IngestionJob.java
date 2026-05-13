package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="ingestion_jobs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IngestionJob {
    public enum Technique { UT, MFL, VISUAL, SETTLEMENT, OTHER }
    public enum Status { UPLOADED, MAPPING, VALIDATED, COMMITTED, FAILED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tank_id",nullable=false) private Tank tank;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="inspection_id") private Inspection inspection;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=15) private Technique technique;
    @Column(name="source_filename",nullable=false,length=255) private String sourceFilename;
    @Column(name="file_sha256",length=64) private String fileSha256;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="uploaded_by",nullable=false) private User uploadedBy;
    @Column(name="upload_date",nullable=false) private LocalDateTime uploadDate;
    @Column(name="total_rows") private Integer totalRows;
    @Column(name="duplicate_count") @Builder.Default private Integer duplicateCount = 0;
    @Column(name="out_of_range_count") @Builder.Default private Integer outOfRangeCount = 0;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=15) private Status status;
    @Column(name="committed_at") private LocalDateTime committedAt;
    @PrePersist protected void onCreate() {
        if(uploadDate==null) uploadDate=LocalDateTime.now();
        if(status==null) status=Status.UPLOADED;
        if(duplicateCount==null) duplicateCount=0;
        if(outOfRangeCount==null) outOfRangeCount=0;
    }
}

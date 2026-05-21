package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="raw_files")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RawFile {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="job_id",nullable=false,unique=true) private IngestionJob job;
    @Column(name="original_filename",nullable=false,length=255) private String originalFilename;
    @Column(name="storage_path",nullable=false,length=500) private String storagePath;
    @Column(name="sha256_hex",nullable=false,length=64,unique=true) private String sha256Hex;
    @Column(name="file_size_bytes") private Long fileSizeBytes;
    @Column(name="content_type",length=80) private String contentType;
    @Column(name="uploaded_at",nullable=false,updatable=false) private LocalDateTime uploadedAt;
    @PrePersist protected void onCreate() { if(uploadedAt==null) uploadedAt=LocalDateTime.now(); }
}

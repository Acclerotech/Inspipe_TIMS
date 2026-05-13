package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="ingestion_column_mappings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IngestionColumnMapping {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="job_id",nullable=false) private IngestionJob job;
    @Column(name="source_column",nullable=false,length=60) private String sourceColumn;
    @Column(name="tims_field",nullable=false,length=60) private String timsField;
    @Column(name="is_required",nullable=false) private boolean required;
}

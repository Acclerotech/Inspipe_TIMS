package com.tims.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ProvenanceResponse {
    private Integer reportId;
    private String reportRef;
    private String calcVersion;
    private List<DataFileEntry> dataFiles;
    private List<SignatoryEntry> signatories;
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DataFileEntry {
        private String filename;
        private String sha256;
        private String technique;
        private LocalDateTime uploadedAt;
    }
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SignatoryEntry {
        private String name;
        private String role;
        private LocalDateTime signedAt;
    }
}

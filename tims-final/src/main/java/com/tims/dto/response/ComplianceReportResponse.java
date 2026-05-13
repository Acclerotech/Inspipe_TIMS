package com.tims.dto.response;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ComplianceReportResponse {
    private Integer id;
    private String tankId;
    private String templateCode;
    private String templateLabel;
    private String standardCode;
    private String reportRef;
    private LocalDate inspectionDate;
    private String units;
    private String status;
    private LocalDateTime generatedAt;
    private String generatedByName;
    private List<SectionResponse> sections;
    private List<SignatoryResponse> signatories;
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SectionResponse { private Integer id; private String sectionName; private boolean included; private Byte sortOrder; }
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SignatoryResponse { private Integer id; private String userFullName; private String role; private LocalDateTime signedAt; }
}

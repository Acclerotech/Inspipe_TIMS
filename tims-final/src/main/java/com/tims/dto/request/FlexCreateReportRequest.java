package com.tims.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class FlexCreateReportRequest {
    /** Business tank ID string e.g. "T-101" */
    @NotNull private String tankId;

    /** Report type string e.g. "WSE", "API653" — resolved to templateId */
    private String type;

    /** Standard code string e.g. "API-653" — resolved to standardId */
    private String standard;

    /** Optional direct IDs (take priority over type/standard strings) */
    private Byte  templateId;
    private Short standardId;

    /** Optional caller-supplied ref; auto-generated if null */
    private String reportRef;

    @NotNull private LocalDate inspectionDate;

    private List<String> sectionNames;

    /** Frontend sends name+role; backend resolves userId from name */
    private List<ApproverEntry> approvers;
    /** Direct signatories (numeric userId) — used if approvers is null */
    private List<CreateReportRequest.SignatoryEntry> signatories;

    @Data
    public static class ApproverEntry {
        private String name;
        private String role;
    }
}

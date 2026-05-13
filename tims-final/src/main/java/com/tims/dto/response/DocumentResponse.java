package com.tims.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DocumentResponse {
    private Integer       id;
    private String        title;
    private String        filename;
    private String        docType;
    private String        version;
    private String        uploadedBy;
    private LocalDateTime uploadedAt;
}

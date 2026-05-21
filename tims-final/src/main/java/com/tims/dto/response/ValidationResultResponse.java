package com.tims.dto.response;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ValidationResultResponse {
    private Integer jobId;
    private boolean valid;
    private boolean blocked;
    private String  blockReason;
    private int     warningCount;
    private String  warningMessage;
    private Integer duplicateCount;
    private Integer outOfRangeCount;

    /**
     * FIX (ING-002): Frontend checks result.status === 'ERRORS'|'WARNINGS'|'OK'
     * Backend never set this field — now derived and always populated.
     */
    private String status; // "OK" | "WARNINGS" | "ERRORS"

    /** Convenience builder helper — call after setting other fields */
    public ValidationResultResponse deriveStatus() {
        if (blocked || !valid) {
            this.status = "ERRORS";
        } else if (warningCount > 0) {
            this.status = "WARNINGS";
        } else {
            this.status = "OK";
        }
        return this;
    }
}

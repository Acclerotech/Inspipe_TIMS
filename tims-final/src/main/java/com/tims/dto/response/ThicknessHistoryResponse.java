package com.tims.dto.response;
import lombok.*;
import java.math.BigDecimal;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ThicknessHistoryResponse {
    private Integer id;
    private Short measurementYear;
    private BigDecimal avgThicknessMm;
    private BigDecimal minThicknessMm;
    private Short shellCourse;
    private String source;
}

package com.tims.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CriticalAreaResponse {

    private String tankId;

    private String location;

    private BigDecimal minThickness;

    private BigDecimal corrosionRate;

    private String severity;
}
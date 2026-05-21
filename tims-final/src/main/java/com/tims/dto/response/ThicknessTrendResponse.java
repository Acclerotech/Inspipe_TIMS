package com.tims.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThicknessTrendResponse {

    private Short year;

    private Double avgThickness;
}
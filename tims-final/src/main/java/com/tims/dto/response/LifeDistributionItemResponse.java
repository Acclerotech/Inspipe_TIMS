package com.tims.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LifeDistributionItemResponse {

    private String name;

    private long value;

    private long count;

    private double percent;

    private String color;
}
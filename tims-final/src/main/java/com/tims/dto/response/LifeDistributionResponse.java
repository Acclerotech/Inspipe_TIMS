package com.tims.dto.response;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LifeDistributionResponse {

    private List<LifeDistributionItemResponse> distribution;
}
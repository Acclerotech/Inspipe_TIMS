package com.tims.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionStandardResponse {

    private Short id;

    private String code;

    private String label;

    private String edition;
}
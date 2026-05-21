package com.tims.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionTypeResponse {

    private Integer id;
    private String code;
    private String name;
    private String description;
    private String category;
    private String color;
    private Boolean active;
}
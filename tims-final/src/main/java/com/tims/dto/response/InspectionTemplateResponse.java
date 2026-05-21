package com.tims.dto.response;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionTemplateResponse {

    private String id;
    private String code;
    private String name;
    private String description;
    private List<String> outputs;
    private String icon;
    private String color;
}

package com.tims.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDropdownResponse {

    private String id;
    private String name;
}
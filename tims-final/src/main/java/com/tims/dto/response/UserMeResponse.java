package com.tims.dto.response;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserMeResponse {
    private Short id;
    private String email;
    private String fullName;
    private String role;
    private String employeeId;
    private String organisationName;
    private boolean eemuaCertified;
}
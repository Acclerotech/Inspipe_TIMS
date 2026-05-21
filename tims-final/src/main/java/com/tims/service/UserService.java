package com.tims.service;



import com.tims.dto.request.ValidateActionRequest;

import com.tims.dto.response.AccessValidationResponse;
import com.tims.dto.response.UserDropdownResponse;
import com.tims.dto.response.UserMeResponse;
import com.tims.entity.User;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;


    public List<UserDropdownResponse> getUsersByRole(String role) {

        List<User> users;

        if (role != null && !role.isBlank()) {

            User.Role roleEnum = User.Role.valueOf(role.toUpperCase());

            users = userRepository.findByRole(roleEnum);

        } else {
            users = userRepository.findAll();
        }

        return users.stream()
                .map(user -> UserDropdownResponse.builder()
                        .id(String.valueOf(user.getId()))
                        .name(user.getFullName())
                        .build())
                .toList();
    }
    // Role → permitted actions mapping
    private static final Map<String, List<String>> ROLE_PERMISSIONS = Map.of(
            "ADMIN",              List.of("READ","WRITE","DELETE","APPROVE","SIGN","REOPEN","INGEST","OVERRIDE"),
            "INTEGRITY_MANAGER",  List.of("READ","WRITE","APPROVE","SIGN","REOPEN"),
            "INTEGRITY_ENGINEER", List.of("READ","WRITE","INGEST","OVERRIDE"),
            "INSPECTOR",          List.of("READ","WRITE")
    );

    public UserMeResponse getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User: " + email));
        return toMeResponse(user);
    }

    public List<Map<String, Object>> getRoles() {
        return Arrays.stream(User.Role.values())
                .map(r -> Map.<String, Object>of(
                        "role",       r.name(),
                        "permissions", ROLE_PERMISSIONS.getOrDefault(r.name(), List.of())
                ))
                .toList();
    }

    public List<String> getUserPermissions(Short userId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return ROLE_PERMISSIONS.getOrDefault(user.getRole().name(), List.of());
    }

    public AccessValidationResponse validateAction(ValidateActionRequest req) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User: " + email));

        List<String> perms = ROLE_PERMISSIONS.getOrDefault(user.getRole().name(), List.of());
        boolean allowed = perms.contains(req.getAction().toUpperCase());

        return AccessValidationResponse.builder()
                .allowed(allowed)
                .action(req.getAction())
                .entityType(req.getEntityType())
                .reason(allowed ? "Role " + user.getRole().name() + " permits " + req.getAction()
                        : "Role " + user.getRole().name() + " does not permit " + req.getAction())
                .build();
    }

    private UserMeResponse toMeResponse(User u) {
        return UserMeResponse.builder()
                .id(u.getId()).email(u.getEmail()).fullName(u.getFullName())
                .role(u.getRole().name()).employeeId(u.getEmployeeId())
                .organisationName(u.getOrganisation() != null ? u.getOrganisation().getName() : null)
                .eemuaCertified(u.isEemuaCertified())
                .build();
    }
}
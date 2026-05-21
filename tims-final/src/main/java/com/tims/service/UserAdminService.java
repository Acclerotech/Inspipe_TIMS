package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.dto.admin.AdminUserDto;
import com.tims.dto.admin.InviteUserRequest;
import com.tims.dto.admin.UpdateUserRequest;
import com.tims.entity.Organisation;
import com.tims.entity.User;
import com.tims.exception.BusinessException;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.UserRepository;
import com.tims.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserAdminService {

    private final UserRepository userRepository;
    private final AuditService   auditService;

    /** Maps frontend role display strings → User.Role enum. */
    private static final Map<String, User.Role> ROLE_MAP = Map.of(
            "integrity engineer",     User.Role.INTEGRITY_ENGINEER,
            "sr. integrity engineer", User.Role.INTEGRITY_ENGINEER,
            "eemua 159 inspector",    User.Role.INSPECTOR,
            "integrity manager",      User.Role.INTEGRITY_MANAGER,
            "data analyst",           User.Role.INTEGRITY_ENGINEER,
            "administrator",          User.Role.ADMIN,
            "admin",                  User.Role.ADMIN,
            "read only",              User.Role.INSPECTOR
    );

    private static final DateTimeFormatter DT_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    // ── Queries ───────────────────────────────────────────────────────────────

    public List<AdminUserDto> listAll() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    @Transactional
    public AdminUserDto invite(InviteUserRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BusinessException("A user with email " + req.getEmail() + " already exists");
        }

        // Resolve role — accept both enum names and display strings
        User.Role role = resolveRole(req.getRole());

        // Inherit org from the current admin
        String adminEmail = SecurityUtil.currentUserEmail();
        Organisation org = userRepository.findByEmail(adminEmail)
                .map(User::getOrganisation)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found: " + adminEmail));

        // Derive a placeholder employee-id (admin can update later)
        String employeeId = "INV-" + System.currentTimeMillis() % 1_000_000;

        User newUser = User.builder()
                .email(req.getEmail())
                .fullName(req.getEmail().split("@")[0]) // placeholder until user completes profile
                .employeeId(employeeId)
                .role(role)
                .status(User.Status.PENDING)
                .organisation(org)
                .eemuaCertified(false)
                .build();

        User saved = userRepository.save(newUser);
        auditService.record("USER", String.valueOf(saved.getId()),
                AuditEvent.Action.CREATE, null, saved, "Invited via admin panel");

        log.info("[ADMIN] User invited: {} role={}", saved.getEmail(), role);
        return toDto(saved);
    }

    @Transactional
    public AdminUserDto update(Long id, UpdateUserRequest req) {
        User user = userRepository.findById(id.shortValue())
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        User before = cloneForAudit(user);

        if (req.getRole() != null && !req.getRole().isBlank()) {
            user.setRole(resolveRole(req.getRole()));
        }
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            user.setStatus(resolveStatus(req.getStatus()));
        }

        User saved = userRepository.save(user);
        auditService.record("USER", String.valueOf(saved.getId()),
                AuditEvent.Action.UPDATE, before, saved, "Updated via admin panel");

        return toDto(saved);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private AdminUserDto toDto(User u) {
        return AdminUserDto.builder()
                .id(u.getId() == null ? null : u.getId().longValue())
                .name(u.getFullName())
                .email(u.getEmail())
                .role(u.getRole().name())
                .status(formatStatus(u.getStatus()))
                .lastLogin(u.getLastLogin() != null ? u.getLastLogin().format(DT_FMT) : null)
                .build();
    }

    /** ACTIVE → "Active", INACTIVE → "Inactive", PENDING → "Pending" */
    private String formatStatus(User.Status s) {
        if (s == null) return "Active";
        String name = s.name();
        return name.charAt(0) + name.substring(1).toLowerCase(Locale.ROOT);
    }

    /** Resolves both enum names (ADMIN) and display strings (Administrator). */
    private User.Role resolveRole(String raw) {
        if (raw == null) throw new BusinessException("Role must not be blank");
        // Try direct enum name first (e.g. "ADMIN", "INTEGRITY_ENGINEER")
        try {
            return User.Role.valueOf(raw.trim().toUpperCase(Locale.ROOT).replace(' ', '_'));
        } catch (IllegalArgumentException ignored) {
            // Fall through to display-name map
        }
        User.Role mapped = ROLE_MAP.get(raw.trim().toLowerCase(Locale.ROOT));
        if (mapped == null) {
            throw new BusinessException("Unrecognised role: '" + raw + "'");
        }
        return mapped;
    }

    private User.Status resolveStatus(String raw) {
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "active"   -> User.Status.ACTIVE;
            case "inactive" -> User.Status.INACTIVE;
            case "pending"  -> User.Status.PENDING;
            default -> throw new BusinessException("Unrecognised status: '" + raw + "'");
        };
    }

    /** Shallow copy for before-state audit snapshot (avoids Hibernate proxy issues). */
    private User cloneForAudit(User u) {
        return User.builder()
                .id(u.getId()).email(u.getEmail()).fullName(u.getFullName())
                .role(u.getRole()).status(u.getStatus()).lastLogin(u.getLastLogin())
                .build();
    }
}

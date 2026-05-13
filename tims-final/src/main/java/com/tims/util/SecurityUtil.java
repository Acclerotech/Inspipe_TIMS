package com.tims.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;

/**
 * Convenience methods for accessing the current authenticated user from anywhere
 * without injecting SecurityContext boilerplate in every service.
 */
public final class SecurityUtil {

    private SecurityUtil() {}

    /**
     * Returns the email (username) of the currently authenticated user.
     * Returns "system" if no authentication is present (e.g. scheduled tasks).
     */
    public static String currentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return "system";
        return auth.getName();
    }

    /**
     * Returns the current role as a plain string, e.g. "ROLE_ADMIN".
     */
    public static Optional<String> currentRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Optional.empty();
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .findFirst();
    }

    /**
     * Returns true if the current user has the given role (e.g. "ADMIN", "INTEGRITY_MANAGER").
     * Accepts the role without "ROLE_" prefix.
     */
    public static boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role.toUpperCase()));
    }

    /**
     * Returns true if the current user is an ADMIN.
     */
    public static boolean isAdmin() {
        return hasRole("ADMIN");
    }
}

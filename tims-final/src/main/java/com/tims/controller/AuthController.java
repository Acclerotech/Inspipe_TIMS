package com.tims.controller;
import com.tims.dto.request.LoginRequest;
import com.tims.dto.response.AuthResponse;
import com.tims.entity.User;
import com.tims.repository.UserRepository;
import com.tims.security.JwtUtils;
import com.tims.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
@Tag(name="Authentication")
public class AuthController {
    private final AuthService authService;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    // ---------------------------
    // REQUEST DTO
    // ---------------------------
    public record DevTokenRequest(String email) {
    }

    // ---------------------------
    // RESPONSE DTO
    // ---------------------------
    public record TokenResponse(String accessToken, String tokenType) {
    }


    @PostMapping("/login")
    @Operation(summary="Authenticate and receive JWT")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.loginByEmail(request));
    }

//    @PostMapping("/login")
//    @Operation(summary="Authenticate and receive JWT")
//    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
//        return ResponseEntity.ok(authService.login(request));
//    }

//    @PostMapping("/login")
//    public TokenResponse token(@RequestBody DevTokenRequest request) {
//
//        User user = userRepository.findByEmail(request.email())
//                .orElseThrow(() ->
//                        new RuntimeException("User not found: " + request.email())
//                );
//
//        // Normalize role → ALWAYS ROLE_*
//        String role = user.getRole().name();
//        String authority = role.startsWith("ROLE_") ? role : "ROLE_" + role;
//
//        Authentication auth = new UsernamePasswordAuthenticationToken(
//                user.getEmail(),
//                null,
//                List.of(new SimpleGrantedAuthority(authority))
//        );
//
//        String token = jwtUtils.generate(auth);
//
//        return new TokenResponse(token, "Bearer");
//    }
}

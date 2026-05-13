package com.tims.service;

import com.tims.dto.request.LoginRequest;
import com.tims.dto.response.AuthResponse;
import com.tims.entity.User;
import com.tims.repository.UserRepository;
import com.tims.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt for: {}", request.getEmail());
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(),null));
        User user = (User) auth.getPrincipal();
        String token = jwtUtils.generateToken(user);
        log.info("Login successful for: {}", user.getEmail());
        return AuthResponse.builder()
                .accessToken(token).tokenType("Bearer")
                .expiresIn(expirationMs / 1000)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }
    public AuthResponse loginByEmail(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = jwtUtils.generateToken(user);

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(expirationMs / 1000)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }
}

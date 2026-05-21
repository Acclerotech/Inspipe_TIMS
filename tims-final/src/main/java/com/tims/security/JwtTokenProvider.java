//package com.tims.security;
//
//import io.jsonwebtoken.*;
//import io.jsonwebtoken.security.Keys;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.security.core.Authentication;
//import org.springframework.security.core.GrantedAuthority;
//import org.springframework.stereotype.Component;
//
//import java.nio.charset.StandardCharsets;
//import java.security.Key;
//import java.time.Duration;
//import java.time.Instant;
//import java.util.Date;
//import java.util.List;
//
//@Component
//public class JwtTokenProvider {
//
//    @Value("${jwt.secret}")
//    private String secret;
//
//    @Value("${jwt.expiration-minutes}")
//    private long expirationMinutes;
//
//    private Key key() {
//        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
//    }
//
//    // ---------------------------
//    // GENERATE TOKEN
//    // ---------------------------
//    public String generate(Authentication authentication) {
//
//        List<String> roles = authentication.getAuthorities().stream()
//                .map(GrantedAuthority::getAuthority)
//                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
//                .toList();
//
//        return Jwts.builder()
//                .subject(authentication.getName())
//                .claim("roles", roles)
//                .issuedAt(new Date())
//                .expiration(Date.from(
//                        Instant.now().plus(Duration.ofMinutes(expirationMinutes))
//                ))
//                .signWith(key())
//                .compact();
//    }
//
//    // ---------------------------
//    // PARSE TOKEN (0.12.x STYLE)
//    // ---------------------------
//    public Claims parse(String token) {
//        return Jwts.parser()
//                .setSigningKey(key())
//                .build()
//                .parseClaimsJws(token)
//                .getBody();
//    }
//
//    // ---------------------------
//    // VALIDATION
//    // ---------------------------
//    public boolean isValid(String token) {
//        try {
//            parse(token);
//            return true;
//        } catch (Exception e) {
//            return false;
//        }
//    }
//
//    // ---------------------------
//    // EXTRACT EMAIL
//    // ---------------------------
//    public String getEmail(String token) {
//        return parse(token).getSubject();
//    }
//
//    // ---------------------------
//    // EXTRACT ROLES
//    // ---------------------------
//    @SuppressWarnings("unchecked")
//    public List<String> getRoles(String token) {
//
//        Object roles = parse(token).get("roles");
//
//        if (roles == null) {
//            return List.of();
//        }
//
//        return ((List<?>) roles).stream()
//                .map(Object::toString)
//                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
//                .toList();
//    }
//}
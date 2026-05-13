package com.tims.security;


import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

import lombok.extern.slf4j.Slf4j;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
@Slf4j @Component
public class JwtUtils {
    @Value("${app.jwt.secret}") private String jwtSecret;
    @Value("${app.jwt.expiration-ms}") private long jwtExpirationMs;
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }
    public String generateToken(UserDetails userDetails) {
        Map<String,Object> claims = new HashMap<>();
        claims.put("roles", userDetails.getAuthorities().stream().map(a->a.getAuthority()).toList());
        return Jwts.builder().claims(claims).subject(userDetails.getUsername())
            .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis()+jwtExpirationMs))
            .signWith(getSigningKey()).compact();
    }
    public String extractUsername(String token) { return extractClaim(token, Claims::getSubject); }
    public <T> T extractClaim(String token, Function<Claims,T> resolver) {
        return resolver.apply(Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token).getPayload());
    }
    public boolean isTokenValid(String token, UserDetails userDetails) {
        return extractUsername(token).equals(userDetails.getUsername()) && !isTokenExpired(token);
    }
    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }






    // ---------------------------
    // GENERATE TOKEN
    // ---------------------------
    public String generate(Authentication authentication) {

        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                .toList();

        return Jwts.builder()
                .subject(authentication.getName())
                .claim("roles", roles)
                .issuedAt(new Date())
                .expiration(Date.from(
                        Instant.now().plus(Duration.ofMinutes(jwtExpirationMs))
                ))
                .signWith(getSigningKey())
                .compact();
    }

    // ---------------------------
    // PARSE TOKEN (0.12.x STYLE)
    // ---------------------------
    public Claims parse(String token) {
        return Jwts.parser()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // ---------------------------
    // VALIDATION
    // ---------------------------
    public boolean isValid(String token) {
        try {
            parse(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ---------------------------
    // EXTRACT EMAIL
    // ---------------------------
    public String getEmail(String token) {
        return parse(token).getSubject();
    }

    // ---------------------------
    // EXTRACT ROLES
    // ---------------------------
    @SuppressWarnings("unchecked")
    public List<String> getRoles(String token) {

        Object roles = parse(token).get("roles");

        if (roles == null) {
            return List.of();
        }

        return ((List<?>) roles).stream()
                .map(Object::toString)
                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                .toList();
    }

}

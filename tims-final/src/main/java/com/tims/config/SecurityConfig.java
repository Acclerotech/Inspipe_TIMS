package com.tims.config;
import com.tims.repository.UserRepository;
import com.tims.security.JwtAuthFilter;
import com.tims.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;
@Configuration @EnableWebSecurity @EnableMethodSecurity @RequiredArgsConstructor
public class SecurityConfig {
//    private final JwtAuthFilter jwtAuthFilter;
    private final UserRepository userRepository;


    @Bean
    public JwtAuthFilter jwtAuthFilter(JwtUtils jwtUtils, UserDetailsService userDetailsService) {
        return new JwtAuthFilter(jwtUtils, userDetailsService);
    }
    private static final String[] PUBLIC_PATHS = {"/api/auth/**","/v3/api-docs/**","/swagger-ui/**","/swagger-ui.html","/actuator/health"};
    @Bean public SecurityFilterChain filterChain(HttpSecurity http,JwtAuthFilter jwtAuthFilter) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
            .cors(c->c.configurationSource(corsConfigurationSource()))
            .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth->auth
                .requestMatchers(PUBLIC_PATHS).permitAll()
                .requestMatchers("/api/ingestion/**").hasAnyRole("ADMIN","INTEGRITY_ENGINEER")
                .requestMatchers(HttpMethod.POST,"/api/reports/{id}/sign").hasAnyRole("ADMIN","INTEGRITY_MANAGER")
                .requestMatchers("/api/audit/**").hasAnyRole("ADMIN","INTEGRITY_MANAGER")
                    .requestMatchers("/api/assets/**").hasAnyRole("ADMIN","INTEGRITY_ENGINEER","INTEGRITY_MANAGER","INSPECTOR")
                .anyRequest().authenticated())
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter,UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    @Bean public UserDetailsService userDetailsService() {
        return email->userRepository.findByEmail(email).orElseThrow(()->new UsernameNotFoundException("User not found: "+email));
    }
    @Bean public AuthenticationProvider authenticationProvider() {
        var p=new DaoAuthenticationProvider(); p.setUserDetailsService(userDetailsService()); p.setPasswordEncoder(passwordEncoder()); return p;
    }
    @Bean public AuthenticationManager authenticationManager(AuthenticationConfiguration c) throws Exception { return c.getAuthenticationManager(); }
    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean public CorsConfigurationSource corsConfigurationSource() {
        var c=new CorsConfiguration(); c.setAllowedOriginPatterns(List.of("*")); c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS")); c.setAllowedHeaders(List.of("*")); c.setAllowCredentials(true);
        var s=new UrlBasedCorsConfigurationSource(); s.registerCorsConfiguration("/**",c); return s;
    }
}

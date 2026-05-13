package com.tims.config;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Configuration
@SecurityScheme(name="bearerAuth",type=SecuritySchemeType.HTTP,scheme="bearer",bearerFormat="JWT")
public class OpenApiConfig {
    @Bean public OpenAPI timsOpenAPI() {
        return new OpenAPI().info(new Info().title("TIMS – Tank Integrity Management System API").description("REST API for TIMS: fleet dashboard, inspections, ingestion, heatmap, compliance reports.").version("1.0.0"));
    }
}

package com.tims.controller;

import com.tims.dto.response.InspectionTemplateResponse;
import com.tims.service.InspectionTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inspection-templates")
@RequiredArgsConstructor
@Tag(name = "Inspection Templates")
@SecurityRequirement(name = "bearerAuth")
public class InspectionTemplateController {

    private final InspectionTemplateService inspectionTemplateService;

    @GetMapping
    @Operation(summary = "Get available inspection templates")
    public ResponseEntity<List<InspectionTemplateResponse>> getTemplates() {

        return ResponseEntity.ok(
                inspectionTemplateService.getTemplates()
        );
    }
}
package com.tims.service;


import com.tims.dto.response.InspectionTemplateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class InspectionTemplateService {

    public List<InspectionTemplateResponse> getTemplates() {

        return List.of(

                InspectionTemplateResponse.builder()
                        .id("wse")
                        .code("WSE")
                        .name("WSE – Wall Thickness Evaluation")
                        .description("Assess remaining wall thickness and predict remaining life based on corrosion data.")
                        .outputs(List.of(
                                "Corrosion rate calculation",
                                "Remaining life prediction",
                                "Thickness heatmaps",
                                "Defect mapping"
                        ))
                        .icon("📡")
                        .color("blue")
                        .build(),

                InspectionTemplateResponse.builder()
                        .id("ffs")
                        .code("FFS")
                        .name("Fitness for Service (FFS)")
                        .description("Evaluate structural integrity and fitness for continued safe operation per API 579 / ASME standards.")
                        .outputs(List.of(
                                "FFS assessments (API 579)",
                                "MAWP / Design pressure checks",
                                "Damage mechanism evaluation",
                                "Repair recommendations"
                        ))
                        .icon("🛡️")
                        .color("green")
                        .build(),

                InspectionTemplateResponse.builder()
                        .id("ils")
                        .code("ILS")
                        .name("Inline Service (ILS) Evaluation")
                        .description("Comprehensive integrity evaluation for in-service tanks combining thickness, FFS and risk.")
                        .outputs(List.of(
                                "Integrated corrosion & FFS",
                                "Risk-based prioritization",
                                "Inspection planning",
                                "Action tracking"
                        ))
                        .icon("📊")
                        .color("purple")
                        .build()
        );
    }
}


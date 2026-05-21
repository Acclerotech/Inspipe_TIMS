package com.tims.controller;

import com.tims.dto.response.ActivityRecordResponse;
import com.tims.dto.response.ActivitySummaryResponse;
import com.tims.service.ActivityService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/activity")
@RequiredArgsConstructor
@Tag(name = "Activity")
@SecurityRequirement(name = "bearerAuth")
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping
    public Page<ActivityRecordResponse> getActivities(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {

        return activityService.getActivities(page, size);
    }

    @GetMapping("/summary")
    public ActivitySummaryResponse getSummary() {
        return activityService.getSummary();
    }

    @GetMapping("/modules")
    public List<String> getModules() {
        return activityService.getModules();
    }

    @GetMapping("/users")
    public List<Map<String, String>> getUsers() {
        return activityService.getUsers();
    }
}
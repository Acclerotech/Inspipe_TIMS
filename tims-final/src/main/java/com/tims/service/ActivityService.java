package com.tims.service;

import com.tims.dto.response.ActivityRecordResponse;
import com.tims.dto.response.ActivitySummaryResponse;
import com.tims.entity.ActivityFeed;
import com.tims.repository.ActivityFeedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityFeedRepository repository;

    public Page<ActivityRecordResponse> getActivities(
            int page,
            int size
    ) {

        return repository
                .findAllByOrderByOccurredAtDesc(PageRequest.of(page, size))
                .map(this::mapToResponse);
    }

    public ActivitySummaryResponse getSummary() {

        long total = repository.count();

        long inspection = repository.countByActivityType(ActivityFeed.ActivityType.INSPECTION);

        long reports = repository.countByActivityType(ActivityFeed.ActivityType.REPORT);

        long defects = repository.countByActivityType(ActivityFeed.ActivityType.DEFECT);

        long uploads = repository.countByActivityType(ActivityFeed.ActivityType.UPLOAD);

        return ActivitySummaryResponse.builder()
                .total(total)
                .assetActivities(defects)
                .inspectionActivities(inspection)
                .userManagement(reports)
                .systemActivities(uploads)
                .build();
    }

    public List<String> getModules() {

        return List.of(
                "UPLOAD",
                "ASSESSMENT",
                "IMPORT",
                "REPORT",
                "INSPECTION",
                "DEFECT"
        );
    }

    public List<Map<String, String>> getUsers() {

        return repository.findAll()
                .stream()
                .map(a -> a.getUser())
                .distinct()
                .map(u -> Map.of(
                        "id", String.valueOf(u.getId()),
                        "name", u.getUsername()
                ))
                .toList();
    }

    private ActivityRecordResponse mapToResponse(ActivityFeed a) {

        return ActivityRecordResponse.builder()
                .id(a.getId())
                .datetime(a.getOccurredAt())
                .activity(a.getTitle())
                .description(a.getDetail())
                .module(a.getActivityType().name())

                .entityId(
                        a.getTank() != null
                                ? String.valueOf(a.getTank().getId())
                                : null
                )

                .entityName(
                        a.getTank() != null
                                ? a.getTank().getTankId()
                                : null
                )

                .entityRef(
                        a.getTank() != null
                                ? a.getTank().getTankId()
                                : null
                )

                .performedBy(a.getUser().getUsername())

                .role(
                        a.getUser().getRole() != null
                                ? a.getUser().getRole().name()
                                : "USER"
                )

                .severity(getSeverity(a))

                .ipAddress(null)

                .build();
    }

    private String getSeverity(ActivityFeed a) {

        return switch (a.getActivityType()) {

            case DEFECT -> "High";

            case INSPECTION -> "Medium";

            case REPORT -> "Low";

            default -> "Info";
        };
    }
}
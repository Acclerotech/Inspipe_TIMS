package com.tims.service;



import com.tims.dto.response.InspectionAlertResponse;
import com.tims.entity.InspectionAlert;
import com.tims.entity.Tank;
import com.tims.entity.User;
import com.tims.exception.ResourceNotFoundException;
import com.tims.exception.UnauthorizedException;
import com.tims.repository.InspectionAlertRepository;
import com.tims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final InspectionAlertRepository alertRepository;
    private final UserRepository userRepository;


    // ── NEW: Method to Create Alerts ─────────────────────────────────────────
    @Transactional
    public void createAlert(User assignedTo, Tank tank, String message) {
        InspectionAlert alert = new InspectionAlert();
        alert.setAssignedTo(assignedTo);
        alert.setTank(tank);
        alert.setMessage(message);
        alert.setRead(false);
        alert.setCreatedAt(LocalDateTime.now());

        alertRepository.save(alert);
    }
    @Transactional
    public void createInspectionCreatedAlerts(
            Tank tank,
            String inspectionName,
            User createdBy
    ) {

        List<User> recipients =
                userRepository.findByRoleIn(
                        List.of(
                                User.Role.ADMIN,
                                User.Role.INTEGRITY_MANAGER,
                                User.Role.INTEGRITY_ENGINEER
                        )
                );

        for (User user : recipients) {

            // Optional: skip creator
            if (createdBy != null &&
                    user.getId().equals(createdBy.getId())) {
                continue;
            }

            InspectionAlert alert = new InspectionAlert();

            alert.setAssignedTo(user);

            alert.setTank(tank);

            alert.setMessage(
                    "New inspection created for Tank "
                            + tank.getTankId()
                            + " : "
                            + inspectionName
            );

            alert.setRead(false);

            alert.setCreatedAt(LocalDateTime.now());

            alertRepository.save(alert);
        }
    }

    @Transactional(readOnly = true)
    public Page<InspectionAlert> getMyAlerts(Pageable pageable) {
        var email = SecurityContextHolder.getContext().getAuthentication().getName();
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User: " + email));

        return alertRepository.findByAssignedToIdAndReadFalseOrderByCreatedAtDesc(user.getId(), pageable);
    }

    public Page<InspectionAlertResponse> getAllAlerts(Boolean unreadOnly, Pageable pageable) {

        Page<InspectionAlert> page = alertRepository.findAll(pageable);

        return page.map(alert -> {
            InspectionAlertResponse dto = new InspectionAlertResponse();

            dto.setId(alert.getId());
            dto.setMessage(alert.getMessage());
            dto.setRead(alert.isRead());
            dto.setCreatedAt(alert.getCreatedAt());

            if (alert.getTank() != null) {
                dto.setTankId(alert.getTank().getTankId());

                if (alert.getTank().getSite() != null) {
                    dto.setSiteName(alert.getTank().getSite().getName());

                    if (alert.getTank().getSite().getOrganisation() != null) {
                        dto.setOrganisationName(
                                alert.getTank().getSite().getOrganisation().getName()
                        );
                    }
                }
            }

            return dto;
        });
    }

    @Transactional
    public InspectionAlert acknowledgeAlert(Integer id) {
        var alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InspectionAlert", id));

        alert.setRead(true);
        alert.setAcknowledgedAt(LocalDateTime.now());

        return alertRepository.save(alert);
    }

    public Page<InspectionAlertResponse> getUnreadAlerts(Pageable pageable) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            throw new UnauthorizedException("User not authenticated");
        }

        String email = extractEmail(auth);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));

        return alertRepository
                .findByAssignedToIdAndReadFalseOrderByCreatedAtDesc(user.getId(), pageable)
                .map(this::mapToResponse);
    }

    private InspectionAlertResponse mapToResponse(InspectionAlert alert) {

        Tank tank = alert.getTank();

        return InspectionAlertResponse.builder()
                .id(alert.getId())
                .message(alert.getMessage())
                .read(alert.isRead())
                .createdAt(alert.getCreatedAt())
                .tankId(tank != null ? tank.getTankId(): null)
                .siteName(
                        tank != null && tank.getSite() != null
                                ? tank.getSite().getName()
                                : null
                )
                .organisationName(
                        tank != null
                                && tank.getSite() != null
                                && tank.getSite().getOrganisation() != null
                                ? tank.getSite().getOrganisation().getName()
                                : null
                )
                .build();
    }

    private String extractEmail(Authentication auth) {
        Object principal = auth.getPrincipal();

        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }

        if (principal instanceof String s) {
            return s;
        }

        throw new UnauthorizedException("Invalid authentication principal");
    }
}

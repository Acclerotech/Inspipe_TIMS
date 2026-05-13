package com.tims.service;



import com.tims.dto.response.InspectionAlertResponse;
import com.tims.entity.InspectionAlert;
import com.tims.exception.ResourceNotFoundException;
import com.tims.repository.InspectionAlertRepository;
import com.tims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final InspectionAlertRepository alertRepository;
    private final UserRepository userRepository;

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
                dto.setTankName(alert.getTank().getTankId());

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
}
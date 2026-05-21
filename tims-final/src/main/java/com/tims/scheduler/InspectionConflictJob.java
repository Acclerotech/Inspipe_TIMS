package com.tims.scheduler;

import com.tims.entity.*;
import com.tims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class InspectionConflictJob {

    private final InspectionRepository inspectionRepository;
    private final CorrosionAssessmentRepository corrosionRepo;
    private final InspectionAlertRepository alertRepository;

    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void detectConflicts() {
        log.info("[ConflictJob] Starting nightly inspection conflict detection");
        List<Inspection> planned = inspectionRepository.findByStatusOrderByPlannedDateAsc(Inspection.Status.PLANNED);
        int alertsCreated = 0;
        for (Inspection inspection : planned) {
            if (inspection.getPlannedDate() == null) continue;
            Tank tank = inspection.getTank();
            var assessmentOpt = corrosionRepo.findLatestByTankId(tank.getId());
            if (assessmentOpt.isEmpty()) continue;
            BigDecimal remainingLifeYr = assessmentOpt.get().getOverallRemainingLifeYr();
            if (remainingLifeYr == null) continue;
            long daysUntilInspection = ChronoUnit.DAYS.between(LocalDate.now(), inspection.getPlannedDate());
            long remainingLifeDays = (long)(remainingLifeYr.doubleValue() * 365.25);
            if (remainingLifeDays < daysUntilInspection) {
                boolean alreadyAlerted = alertRepository.existsByInspectionIdAndAlertType(
                        inspection.getId(), InspectionAlert.AlertType.CONFLICT);
                if (alreadyAlerted) continue;
                LocalDate proposedDate = LocalDate.now().plusDays((long)(remainingLifeDays * 0.9));
                String message = String.format("CONFLICT: Tank %s remaining life (%d days) < days until inspection (%d days). Proposed date: %s.",
                        tank.getTankId(), remainingLifeDays, daysUntilInspection, proposedDate);
                var alert = InspectionAlert.builder().tank(tank).inspection(inspection)
                    .alertType(InspectionAlert.AlertType.CONFLICT).message(message)
                    .proposedDate(proposedDate).assignedTo(inspection.getInspector()).build();
                alertRepository.save(alert);
                alertsCreated++;
                log.warn("[ConflictJob] CONFLICT: {}", message);
            }
        }
        log.info("[ConflictJob] Done. {} alerts created.", alertsCreated);
    }
}

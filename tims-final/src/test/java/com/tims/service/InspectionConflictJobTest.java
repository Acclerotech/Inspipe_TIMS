package com.tims.service;

import com.tims.entity.*;
import com.tims.repository.*;
import com.tims.scheduler.InspectionConflictJob;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AT-032 - Nightly Inspection Conflict Detection")
class InspectionConflictJobTest {

//    @Mock InspectionRepository inspectionRepository;
//    @Mock CorrosionAssessmentRepository corrosionRepo;
//    @Mock InspectionAlertRepository alertRepository;
//
//    @InjectMocks InspectionConflictJob conflictJob;
//
//    @Test
//    @DisplayName("AT-032: Remaining life < days-to-inspection creates conflict alert with proposed date")
//    void conflict_detected_alertPosted() {
//        Tank tank = new Tank(); tank.setId((short) 1); tank.setTankCode("T-001");
//        User inspector = new User(); inspector.setId((short) 5);
//
//        Inspection inspection = new Inspection();
//        inspection.setId(10);
//        inspection.setTank(tank);
//        inspection.setInspector(inspector);
//        inspection.setPlannedDate(LocalDate.now().plusDays(365));
//
//        CorrosionAssessment assessment = new CorrosionAssessment();
//        assessment.setOverallRemainingLifeYr(new BigDecimal("0.49")); // ~179 days < 365
//
//        when(inspectionRepository.findByStatusOrderByPlannedDateAsc(Inspection.Status.PLANNED))
//                .thenReturn(List.of(inspection));
//        when(corrosionRepo.findLatestByTankId((short) 1)).thenReturn(Optional.of(assessment));
//        when(alertRepository.existsByInspectionIdAndAlertType(10, InspectionAlert.AlertType.CONFLICT))
//                .thenReturn(false);
//        when(alertRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
//
//        conflictJob.detectConflicts();
//
//        verify(alertRepository).save(argThat(a -> {
//            InspectionAlert alert = (InspectionAlert) a;
//            assertThat(alert.getAlertType()).isEqualTo(InspectionAlert.AlertType.CONFLICT);
//            assertThat(alert.getProposedDate()).isNotNull();
//            assertThat(alert.getProposedDate()).isBefore(inspection.getPlannedDate());
//            assertThat(alert.getMessage()).contains("T-001");
//            return true;
//        }));
//    }
//
//    @Test
//    @DisplayName("AT-032: Remaining life > days-to-inspection produces no alert")
//    void noConflict_noAlert() {
//        Tank tank = new Tank(); tank.setId((short) 2); tank.setTankCode("T-002");
//        User inspector = new User(); inspector.setId((short) 6);
//
//        Inspection inspection = new Inspection();
//        inspection.setId(20);
//        inspection.setTank(tank);
//        inspection.setInspector(inspector);
//        inspection.setPlannedDate(LocalDate.now().plusDays(30));
//
//        CorrosionAssessment assessment = new CorrosionAssessment();
//        assessment.setOverallRemainingLifeYr(new BigDecimal("5.0")); // 1826 days >> 30
//
//        when(inspectionRepository.findByStatusOrderByPlannedDateAsc(Inspection.Status.PLANNED))
//                .thenReturn(List.of(inspection));
//        when(corrosionRepo.findLatestByTankId((short) 2)).thenReturn(Optional.of(assessment));
//
//        conflictJob.detectConflicts();
//
//        verify(alertRepository, never()).save(any());
//    }
//
//    @Test
//    @DisplayName("AT-032: Duplicate alert not created if one already exists")
//    void existingAlert_notDuplicated() {
//        Tank tank = new Tank(); tank.setId((short) 3); tank.setTankCode("T-003");
//        User inspector = new User(); inspector.setId((short) 7);
//
//        Inspection inspection = new Inspection();
//        inspection.setId(30);
//        inspection.setTank(tank);
//        inspection.setInspector(inspector);
//        inspection.setPlannedDate(LocalDate.now().plusDays(365));
//
//        CorrosionAssessment assessment = new CorrosionAssessment();
//        assessment.setOverallRemainingLifeYr(new BigDecimal("0.3"));
//
//        when(inspectionRepository.findByStatusOrderByPlannedDateAsc(Inspection.Status.PLANNED))
//                .thenReturn(List.of(inspection));
//        when(corrosionRepo.findLatestByTankId((short) 3)).thenReturn(Optional.of(assessment));
//        when(alertRepository.existsByInspectionIdAndAlertType(30, InspectionAlert.AlertType.CONFLICT))
//                .thenReturn(true);
//
//        conflictJob.detectConflicts();
//
//        verify(alertRepository, never()).save(any());
//    }
//
//    @Test
//    @DisplayName("AT-032: Inspection with no planned date is skipped")
//    void nullPlannedDate_skipped() {
//        Tank tank = new Tank(); tank.setId((short) 4);
//        User inspector = new User(); inspector.setId((short) 8);
//
//        Inspection inspection = new Inspection();
//        inspection.setId(40);
//        inspection.setTank(tank);
//        inspection.setInspector(inspector);
//        inspection.setPlannedDate(null); // no date set
//
//        when(inspectionRepository.findByStatusOrderByPlannedDateAsc(Inspection.Status.PLANNED))
//                .thenReturn(List.of(inspection));
//
//        conflictJob.detectConflicts();
//
//        verify(corrosionRepo, never()).findLatestByTankId(any());
//        verify(alertRepository, never()).save(any());
//    }
}

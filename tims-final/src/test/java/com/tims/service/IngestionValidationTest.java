package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.entity.*;
import com.tims.exception.BusinessException;
import com.tims.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AT-021 / AT-022 / AT-023 - Ingestion Validation Pipeline")
class IngestionValidationTest {

//    @Mock IngestionColumnMappingRepository mappingRepository;
//    @Mock UtReadingRepository utReadingRepository;
//    @Mock DefectRepository defectRepository;
//    @Mock DefectClassRepository defectClassRepository;
//    @Mock AuditService auditService;
//
//    @InjectMocks IngestionValidationPipeline pipeline;
//
//    private IngestionJob job;
//
//    @BeforeEach
//    void setUp() {
//        job = new IngestionJob();
//        job.setId(10);
//    }
//
//    @Test
//    @DisplayName("AT-023: Column ending in _in triggers unit mismatch block")
//    void unitMismatch_inSuffix_blocksValidation() {
//        var mapping = new IngestionColumnMapping();
//        mapping.setSourceColumn("wall_thickness_in");
//        mapping.setTimsField("thickness_mm");
//        when(mappingRepository.findByJobId(10)).thenReturn(List.of(mapping));
//
//        var result = pipeline.validate(job);
//
//        assertThat(result.blocked).isTrue();
//        assertThat(result.blockReason).contains("mm");
//        assertThat(result.blockReason).contains("wall_thickness_in");
//        assertThat(result.valid).isFalse();
//    }
//
//    @Test
//    @DisplayName("AT-023: Correct mm column passes unit check")
//    void correctMmColumn_passesValidation() {
//        var mapping = new IngestionColumnMapping();
//        mapping.setSourceColumn("thickness_mm");
//        mapping.setTimsField("thickness_mm");
//        when(mappingRepository.findByJobId(10)).thenReturn(List.of(mapping));
//        when(utReadingRepository.findByJobIdAndBelowRetirementTrue(10)).thenReturn(List.of());
//        when(utReadingRepository.countDuplicateReadingsByJobId(10)).thenReturn(0L);
//
//        var result = pipeline.validate(job);
//
//        assertThat(result.blocked).isFalse();
//        assertThat(result.valid).isTrue();
//        assertThat(result.warningCount).isZero();
//    }
//
//    @Test
//    @DisplayName("AT-022: Below-retirement reading generates warning but does not block")
//    void belowRetirement_generatesWarning_notBlocked() {
//        var mapping = new IngestionColumnMapping();
//        mapping.setSourceColumn("wall_thickness_mm");
//        mapping.setTimsField("thickness_mm");
//        when(mappingRepository.findByJobId(10)).thenReturn(List.of(mapping));
//
//        var r = new UtReading();
//        r.setBelowRetirement(true);
//        r.setThicknessMm(new BigDecimal("5.8"));
//        when(utReadingRepository.findByJobIdAndBelowRetirementTrue(10)).thenReturn(List.of(r));
//        when(utReadingRepository.countDuplicateReadingsByJobId(10)).thenReturn(0L);
//
//        var result = pipeline.validate(job);
//
//        assertThat(result.blocked).isFalse();
//        assertThat(result.valid).isTrue();
//        assertThat(result.warningCount).isEqualTo(1);
//        assertThat(result.warningMessage).containsIgnoringCase("retirement");
//    }
//
//    @Test
//    @DisplayName("AT-022: createThresholdBreachDefects saves Defect per breach - no silent drop")
//    void thresholdBreach_createsDefectRecords() {
//        Tank tank = new Tank(); tank.setId((short) 1); tank.setTankCode("T-001");
//        job.setTank(tank);
//
//        var r = new UtReading();
//        r.setReadingId("R-001");
//        r.setBelowRetirement(true);
//        r.setThicknessMm(new BigDecimal("5.8"));
//        r.setNominalMm(new BigDecimal("8.0"));
//        r.setShellCourse((short) 1);
//        r.setAngleDeg(new BigDecimal("45.0"));
//
//        when(utReadingRepository.findByJobIdAndBelowRetirementTrue(10)).thenReturn(List.of(r));
//        DefectClass class1 = new DefectClass(); class1.setClassNum((byte) 1);
//        when(defectClassRepository.findByClassNum((byte) 1)).thenReturn(Optional.of(class1));
//        when(defectRepository.existsByDefectCode(anyString())).thenReturn(false);
//        when(defectRepository.save(any())).thenAnswer(inv -> { Defect d = inv.getArgument(0); d.setId(1); return d; });
//
//        int count = pipeline.createThresholdBreachDefects(job, tank);
//
//        assertThat(count).isEqualTo(1);
//        verify(defectRepository).save(argThat(d ->
//                ((Defect) d).getDefectCode().startsWith("UT-BREACH-T-001") &&
//                ((Defect) d).getStatus() == Defect.Status.OPEN));
//        verify(auditService).record(eq("Defect"), any(), eq(AuditEvent.Action.CREATE), isNull(), any());
//    }
//
//    @Test
//    @DisplayName("AT-022: Duplicate breach defect is idempotent - not created twice")
//    void existingBreachDefect_notDuplicated() {
//        Tank tank = new Tank(); tank.setId((short) 2); tank.setTankCode("T-002");
//        job.setTank(tank);
//        var r = new UtReading(); r.setReadingId("R-002"); r.setBelowRetirement(true);
//        r.setThicknessMm(new BigDecimal("5.0")); r.setNominalMm(new BigDecimal("8.0"));
//        when(utReadingRepository.findByJobIdAndBelowRetirementTrue(10)).thenReturn(List.of(r));
//        DefectClass class1 = new DefectClass(); class1.setClassNum((byte) 1);
//        when(defectClassRepository.findByClassNum((byte) 1)).thenReturn(Optional.of(class1));
//        when(defectRepository.existsByDefectCode(anyString())).thenReturn(true);
//
//        int count = pipeline.createThresholdBreachDefects(job, tank);
//
//        assertThat(count).isZero();
//        verify(defectRepository, never()).save(any());
//    }
//
//    @Test
//    @DisplayName("AT-021: Duplicate readings are counted not silently dropped")
//    void duplicateReadings_areCounted() {
//        var mapping = new IngestionColumnMapping();
//        mapping.setSourceColumn("thickness_mm"); mapping.setTimsField("thickness_mm");
//        when(mappingRepository.findByJobId(10)).thenReturn(List.of(mapping));
//        when(utReadingRepository.findByJobIdAndBelowRetirementTrue(10)).thenReturn(List.of());
//        when(utReadingRepository.countDuplicateReadingsByJobId(10)).thenReturn(3L);
//
//        var result = pipeline.validate(job);
//
//        assertThat(result.duplicateCount).isEqualTo(3);
//        verify(utReadingRepository).countDuplicateReadingsByJobId(10);
//    }
}

package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.entity.*;
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
@DisplayName("AT-051 - MFL EEMUA Classification Engine")
class MflClassificationServiceTest {

//    @Mock MflReadingRepository mflReadingRepository;
//    @Mock DefectRepository defectRepository;
//    @Mock DefectClassRepository defectClassRepository;
//    @Mock AuditService auditService;
//
//    @InjectMocks MflClassificationService classificationService;
//
//    private Tank tank;
//    private IngestionJob job;
//    private DefectClass class1, class2, class3;
//
//    @BeforeEach
//    void setUp() {
//        tank = new Tank(); tank.setId((short) 1); tank.setTankCode("T-TEST");
//        job = new IngestionJob(); job.setId(99);
//
//        class1 = new DefectClass(); class1.setClassNum((byte) 1); class1.setLabel("Critical");
//        class2 = new DefectClass(); class2.setClassNum((byte) 2); class2.setLabel("Major");
//        class3 = new DefectClass(); class3.setClassNum((byte) 3); class3.setLabel("Minor");
//
//        when(defectClassRepository.findByClassNum((byte) 1)).thenReturn(Optional.of(class1));
//        when(defectClassRepository.findByClassNum((byte) 2)).thenReturn(Optional.of(class2));
//        when(defectClassRepository.findByClassNum((byte) 3)).thenReturn(Optional.of(class3));
//    }
//
//    private MflReading mflReading(String plateId, double lossPct) {
//        var r = new MflReading();
//        r.setPlateId(plateId);
//        r.setWallLossPct(BigDecimal.valueOf(lossPct));
//        r.setAngleDeg(BigDecimal.valueOf(45.0));
//        r.setWallLossMm(BigDecimal.valueOf(lossPct * 0.08));
//        r.setNominalMm(BigDecimal.valueOf(8.0));
//        return r;
//    }
//
//    private Defect savedDefect(int id, DefectClass dc, String disposition) {
//        Defect d = new Defect(); d.setId(id); d.setDefectClass(dc); d.setDisposition(disposition); return d;
//    }
//
//    @Test
//    @DisplayName("AT-051: 85% wall loss -> Class 1 IMMEDIATE_ACTION")
//    void wallLoss85_classifiedAsClass1() {
//        when(mflReadingRepository.findByJobId(99)).thenReturn(List.of(mflReading("P-01", 85.0)));
//        when(defectRepository.existsByDefectCode(anyString())).thenReturn(false);
//        when(defectRepository.save(any())).thenAnswer(inv -> { Defect d = inv.getArgument(0); d.setId(1); d.setDefectClass(class1); return d; });
//
//        var defects = classificationService.classifyAndCreateDefects(tank, job);
//
//        assertThat(defects).hasSize(1);
//        verify(defectRepository).save(argThat(d -> ((Defect)d).getDisposition().equals("IMMEDIATE_ACTION")));
//    }
//
//    @Test
//    @DisplayName("AT-051: 70% wall loss -> Class 2 MONITOR_AND_ACTION")
//    void wallLoss70_classifiedAsClass2() {
//        when(mflReadingRepository.findByJobId(99)).thenReturn(List.of(mflReading("P-02", 70.0)));
//        when(defectRepository.existsByDefectCode(anyString())).thenReturn(false);
//        when(defectRepository.save(any())).thenAnswer(inv -> { Defect d = inv.getArgument(0); d.setId(2); d.setDefectClass(class2); return d; });
//
//        var defects = classificationService.classifyAndCreateDefects(tank, job);
//
//        assertThat(defects).hasSize(1);
//        verify(defectRepository).save(argThat(d -> ((Defect)d).getDisposition().equals("MONITOR_AND_ACTION")));
//    }
//
//    @Test
//    @DisplayName("AT-051: 40% wall loss -> Class 3 MONITOR")
//    void wallLoss40_classifiedAsClass3() {
//        when(mflReadingRepository.findByJobId(99)).thenReturn(List.of(mflReading("P-03", 40.0)));
//        when(defectRepository.existsByDefectCode(anyString())).thenReturn(false);
//        when(defectRepository.save(any())).thenAnswer(inv -> { Defect d = inv.getArgument(0); d.setId(3); d.setDefectClass(class3); return d; });
//
//        var defects = classificationService.classifyAndCreateDefects(tank, job);
//
//        assertThat(defects).hasSize(1);
//        verify(defectRepository).save(argThat(d -> ((Defect)d).getDisposition().equals("MONITOR")));
//    }
//
//    @Test
//    @DisplayName("AT-051: 15% wall loss -> below significance threshold, no defect")
//    void wallLoss15_belowThreshold_noDefect() {
//        when(mflReadingRepository.findByJobId(99)).thenReturn(List.of(mflReading("P-04", 15.0)));
//        var defects = classificationService.classifyAndCreateDefects(tank, job);
//        assertThat(defects).isEmpty();
//        verify(defectRepository, never()).save(any());
//    }
//
//    @Test
//    @DisplayName("AT-051: Duplicate reading is idempotent - existing defect not re-created")
//    void duplicateReading_idempotent() {
//        when(mflReadingRepository.findByJobId(99)).thenReturn(List.of(mflReading("P-05", 75.0)));
//        when(defectRepository.existsByDefectCode(anyString())).thenReturn(true);
//        var defects = classificationService.classifyAndCreateDefects(tank, job);
//        assertThat(defects).isEmpty();
//        verify(defectRepository, never()).save(any());
//    }
//
//    @Test
//    @DisplayName("AT-051: Each defect gets location (plateId + angle) and audit event")
//    void defect_hasLocationAndAuditEvent() {
//        when(mflReadingRepository.findByJobId(99)).thenReturn(List.of(mflReading("P-06", 65.0)));
//        when(defectRepository.existsByDefectCode(anyString())).thenReturn(false);
//        when(defectRepository.save(any())).thenAnswer(inv -> { Defect d = inv.getArgument(0); d.setId(4); d.setDefectClass(class2); return d; });
//
//        classificationService.classifyAndCreateDefects(tank, job);
//
//        verify(defectRepository).save(argThat(d -> ((Defect)d).getPlateId().equals("P-06")));
//        verify(auditService).record(eq("Defect"), any(), eq(AuditEvent.Action.CREATE), isNull(), any());
//    }
}

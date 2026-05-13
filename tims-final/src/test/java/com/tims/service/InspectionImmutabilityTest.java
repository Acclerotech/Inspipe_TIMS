package com.tims.service;

import com.tims.audit.AuditEvent;
import com.tims.audit.AuditService;
import com.tims.dto.request.ReopenInspectionRequest;
import com.tims.dto.request.UpdateInspectionStatusRequest;
import com.tims.entity.Inspection;
import com.tims.entity.Tank;
import com.tims.entity.User;
import com.tims.exception.BusinessException;
import com.tims.exception.ImmutableEntityException;
import com.tims.exception.InvalidStateTransitionException;
import com.tims.mapper.InspectionMapper;
import com.tims.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AT-091 / AT-092 - Inspection Immutability and REOPEN")
class InspectionImmutabilityTest {

//    @Mock InspectionRepository inspectionRepository;
//    @Mock TankRepository tankRepository;
//    @Mock InspectionTypeRepository inspectionTypeRepository;
//    @Mock ComplianceStandardRepository standardRepository;
//    @Mock UserRepository userRepository;
//    @Mock VwInspectionCalendarRepository calendarRepository;
//    @Mock InspectionMapper inspectionMapper;
//    @Mock AuditService auditService;
//
//    @InjectMocks InspectionService inspectionService;
//
//    private Inspection approvedInspection;
//
//    @BeforeEach
//    void setUp() {
//        approvedInspection = new Inspection();
//        approvedInspection.setId(42);
//        approvedInspection.setStatus(Inspection.Status.APPROVED);
//        approvedInspection.setReopenCount(0);
//
//        Authentication auth = mock(Authentication.class);
//        when(auth.getName()).thenReturn("a.patel@acclero.com");
//        SecurityContext ctx = mock(SecurityContext.class);
//        when(ctx.getAuthentication()).thenReturn(auth);
//        SecurityContextHolder.setContext(ctx);
//    }
//
//    @Test
//    @DisplayName("AT-091: Editing APPROVED inspection throws ImmutableEntityException")
//    void editApproved_throwsImmutableEntityException() {
//        when(inspectionRepository.findById(42)).thenReturn(Optional.of(approvedInspection));
//        var req = new UpdateInspectionStatusRequest();
//        req.setStatus("IN_PROGRESS");
//        assertThatThrownBy(() -> inspectionService.updateStatus(42, req))
//                .isInstanceOf(ImmutableEntityException.class)
//                .hasMessageContaining("APPROVED");
//    }
//
//    @Test
//    @DisplayName("AT-092: REOPEN without reason throws BusinessException")
//    void reopen_withoutReason_throwsBusinessException() {
//        when(inspectionRepository.findById(42)).thenReturn(Optional.of(approvedInspection));
//        var req = new ReopenInspectionRequest();
//        req.setReason("  ");
//        assertThatThrownBy(() -> inspectionService.reopenInspection(42, req))
//                .isInstanceOf(BusinessException.class)
//                .hasMessageContaining("mandatory");
//    }
//
//    @Test
//    @DisplayName("AT-092: REOPEN with valid reason succeeds and emits REOPEN audit event")
//    void reopen_withValidReason_succeeds() {
//        Tank tank = new Tank(); tank.setId((short) 1); tank.setTankCode("T-001");
//        approvedInspection.setTank(tank);
//        when(inspectionRepository.findById(42)).thenReturn(Optional.of(approvedInspection));
//        when(inspectionRepository.save(any())).thenReturn(approvedInspection);
//        when(userRepository.findByEmail("manager@tims.com")).thenReturn(Optional.of(new User()));
//        when(inspectionMapper.toResponse(any())).thenReturn(null);
//
//        var req = new ReopenInspectionRequest();
//        req.setReason("Measurement error found in shell course 3 - recheck required");
//        inspectionService.reopenInspection(42, req);
//
//        verify(auditService).record(
//                eq("Inspection"), eq("42"), eq(AuditEvent.Action.REOPEN),
//                any(), any(), eq("Measurement error found in shell course 3 - recheck required"));
//        assertThat(approvedInspection.getReopenCount()).isEqualTo(1);
//        assertThat(approvedInspection.getStatus()).isEqualTo(Inspection.Status.REOPENED);
//    }
//
//    @Test
//    @DisplayName("AT-091: REOPENED inspection can transition to IN_PROGRESS")
//    void reopened_canTransitionToInProgress() {
//        Inspection reopened = new Inspection();
//        reopened.setId(44);
//        reopened.setStatus(Inspection.Status.REOPENED);
//        reopened.setReopenCount(1);
//        when(inspectionRepository.findById(44)).thenReturn(Optional.of(reopened));
//        when(inspectionRepository.save(any())).thenReturn(reopened);
//        when(inspectionMapper.toResponse(any())).thenReturn(null);
//        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(new User()));
//
//        var req = new UpdateInspectionStatusRequest();
//        req.setStatus("IN_PROGRESS");
//        assertThatCode(() -> inspectionService.updateStatus(44, req)).doesNotThrowAnyException();
//    }
//
//    @Test
//    @DisplayName("AT-092: REOPEN on non-APPROVED inspection throws BusinessException")
//    void reopen_nonApprovedInspection_throws() {
//        Inspection completed = new Inspection();
//        completed.setId(50);
//        completed.setStatus(Inspection.Status.COMPLETED);
//        completed.setReopenCount(0);
//        when(inspectionRepository.findById(50)).thenReturn(Optional.of(completed));
//        var req = new ReopenInspectionRequest();
//        req.setReason("Trying to reopen a completed inspection");
//        assertThatThrownBy(() -> inspectionService.reopenInspection(50, req))
//                .isInstanceOf(BusinessException.class)
//                .hasMessageContaining("APPROVED");
//    }
//
//    @Test
//    @DisplayName("AT-091: Non-approved inspection updates normally")
//    void inProgress_canBeCompleted() {
//        Inspection inProgress = new Inspection();
//        inProgress.setId(45);
//        inProgress.setStatus(Inspection.Status.IN_PROGRESS);
//        when(inspectionRepository.findById(45)).thenReturn(Optional.of(inProgress));
//        when(inspectionRepository.save(any())).thenReturn(inProgress);
//        when(inspectionMapper.toResponse(any())).thenReturn(null);
//        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(new User()));
//
//        var req = new UpdateInspectionStatusRequest();
//        req.setStatus("COMPLETED");
//        assertThatCode(() -> inspectionService.updateStatus(45, req)).doesNotThrowAnyException();
//    }
}

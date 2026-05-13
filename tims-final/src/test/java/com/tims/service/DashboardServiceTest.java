package com.tims.service;

import com.tims.dto.response.DashboardMetricsResponse;
import com.tims.mapper.TankMapper;
import com.tims.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Dashboard Service Unit Tests")
class DashboardServiceTest {

//    @Mock TankRepository tankRepository;
//    @Mock DefectRepository defectRepository;
//    @Mock InspectionRepository inspectionRepository;
//    @Mock VwTankFleetSummaryRepository fleetSummaryRepository;
//    @Mock TankMapper tankMapper;
//
//    @InjectMocks DashboardService dashboardService;
//
//    @BeforeEach
//    void setUp() {
//        when(tankRepository.count()).thenReturn(42L);
//        when(tankRepository.countInService()).thenReturn(35L);
//        when(tankRepository.countOverdue()).thenReturn(3L);
//        when(defectRepository.countAllOpen()).thenReturn(17L);
//        when(inspectionRepository.countOverdue()).thenReturn(5L);
//    }
//
//    @Test
//    @DisplayName("getMetrics returns correct aggregated values from all repos")
//    void getMetrics_returnsCorrectValues() {
//        DashboardMetricsResponse metrics = dashboardService.getMetrics();
//        assertThat(metrics.getTotalTanks()).isEqualTo(42L);
//        assertThat(metrics.getInServiceTanks()).isEqualTo(35L);
//        assertThat(metrics.getOpenDefects()).isEqualTo(17L);
//        assertThat(metrics.getOverdueInspections()).isEqualTo(5L);
//        assertThat(metrics.getOverdueComplianceTanks()).isEqualTo(3L);
//    }
}

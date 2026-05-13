package com.tims.repository;
import com.tims.entity.view.VwTankFleetSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
@Repository
public interface VwTankFleetSummaryRepository extends JpaRepository<VwTankFleetSummary,String> {
    Page<VwTankFleetSummary> findByRiskCategory(String riskCategory, Pageable pageable);
    Page<VwTankFleetSummary> findByComplianceStatus(String complianceStatus, Pageable pageable);
}

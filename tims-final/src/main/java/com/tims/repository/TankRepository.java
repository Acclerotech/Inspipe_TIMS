package com.tims.repository;
import com.tims.dto.response.ComplianceSummaryResponse;
import com.tims.entity.Tank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface TankRepository extends JpaRepository<Tank,Short> {
    Optional<Tank> findByTankId(String tankId);
    boolean existsByTankId(String tankId);

    @Query("SELECT COUNT(t) FROM Tank t WHERE t.operationalStatus='IN_SERVICE'") long countInService();
    @Query("SELECT COUNT(t) FROM Tank t WHERE t.complianceStatus='OVERDUE'") long countOverdue();

            @Query("""
        SELECT new com.tims.dto.response.ComplianceSummaryResponse(
            COUNT(t),
            SUM(CASE WHEN t.complianceStatus = 'COMPLIANT' THEN 1 ELSE 0 END),
            SUM(CASE WHEN t.complianceStatus = 'ACTION_REQUIRED' THEN 1 ELSE 0 END),
            SUM(CASE WHEN t.complianceStatus = 'OVERDUE' THEN 1 ELSE 0 END),
            0.0
        )
        FROM Tank t
        """)
    ComplianceSummaryResponse getComplianceStats();
}

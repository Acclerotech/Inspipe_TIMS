package com.tims.repository;
import com.tims.entity.ComplianceReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ComplianceReportRepository extends JpaRepository<ComplianceReport,Integer> {
    Page<ComplianceReport> findByTankId(String tankId, Pageable pageable);
    boolean existsByReportRef(String reportRef);
    // REP-002: resolve latest report for tank-level compliance-pack
    @Query("SELECT r FROM ComplianceReport r WHERE r.tank.id = :tankId " +
         "ORDER BY r.generatedAt DESC")
    Optional<ComplianceReport> findFirstByTankIdOrderByGeneratedAtDesc(Short tankId);

    Optional<ComplianceReport> findTopByTankIdOrderByGeneratedAtDesc(Short tankId);
}

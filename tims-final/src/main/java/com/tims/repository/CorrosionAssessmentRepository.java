package com.tims.repository;
import com.tims.dto.response.CriticalAreaResponse;
import com.tims.entity.CorrosionAssessment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
@Repository
public interface CorrosionAssessmentRepository extends JpaRepository<CorrosionAssessment,Integer> {
    @Query("SELECT ca FROM CorrosionAssessment ca WHERE ca.tank.id=:tankId AND ca.assessmentDate=(SELECT MAX(ca2.assessmentDate) FROM CorrosionAssessment ca2 WHERE ca2.tank.id=:tankId)")
    Optional<CorrosionAssessment> findLatestByTankId(@Param("tankId") Short tankId);
    // History ordered newest-first
    List<CorrosionAssessment> findByTankIdOrderByAssessmentDateDesc(Short tankId);

    Page<CorrosionAssessment> findByTankId(Short tankId, Pageable pageable);
    @Query("""
    SELECT new com.tims.dto.response.CriticalAreaResponse(
        t.tankId,
        'SHELL',
        ca.shellMinThicknessMm,
        ca.shellCorrRateMmYr,
        CASE
            WHEN ca.shellRemainingLifeYr <= 3 THEN 'HIGH'
            WHEN ca.shellRemainingLifeYr <= 7 THEN 'MEDIUM'
            ELSE 'LOW'
        END
    )
    FROM CorrosionAssessment ca
    JOIN ca.tank t
    WHERE ca.shellMinThicknessMm IS NOT NULL
    ORDER BY ca.shellRemainingLifeYr ASC
""")
    List<CriticalAreaResponse> getCriticalAreas(Pageable pageable);

    @Query("""
    SELECT
        CASE
            WHEN ca.overallRemainingLifeYr < 5 THEN '< 5 years'
            WHEN ca.overallRemainingLifeYr < 10 THEN '5–10 years'
            WHEN ca.overallRemainingLifeYr < 20 THEN '10–20 years'
            ELSE '> 20 years'
        END,
        COUNT(ca)
    FROM CorrosionAssessment ca
    WHERE ca.overallRemainingLifeYr IS NOT NULL
    GROUP BY
        CASE
            WHEN ca.overallRemainingLifeYr < 5 THEN '< 5 years'
            WHEN ca.overallRemainingLifeYr < 10 THEN '5–10 years'
            WHEN ca.overallRemainingLifeYr < 20 THEN '10–20 years'
            ELSE '> 20 years'
        END
""")
    List<Object[]> getLifeDistribution();

    @Query("""
SELECT c FROM CorrosionAssessment c
WHERE c.tank.tankId = :tankId
ORDER BY c.assessmentDate DESC
""")
    Optional<CorrosionAssessment> findLatestByTankId(@Param("tankId") String tankId);
    Optional<CorrosionAssessment> findTopByTank_IdOrderByCreatedAtDesc(Short tankId);
}

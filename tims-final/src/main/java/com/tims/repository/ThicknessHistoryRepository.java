package com.tims.repository;
import com.tims.dto.response.HeatmapTankResponse;
import com.tims.dto.response.ThicknessTrendResponse;
import com.tims.entity.ThicknessHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface ThicknessHistoryRepository extends JpaRepository<ThicknessHistory,Integer> {
    List<ThicknessHistory> findByTankIdOrderByMeasurementYearAsc(Short tankId);
    List<ThicknessHistory> findByTank_TankIdOrderByMeasurementYearAsc(String tankId);

    @Query("""
        SELECT new com.tims.dto.response.ThicknessTrendResponse(
            th.measurementYear,
            AVG(th.avgThicknessMm)
        )
        FROM ThicknessHistory th
        GROUP BY th.measurementYear
        ORDER BY th.measurementYear ASC
    """)
    List<ThicknessTrendResponse> getThicknessTrend();

    @Query("""
        SELECT new com.tims.dto.response.HeatmapTankResponse(
            t.tankId,
            ps.name,
            rc.label,
            rc.colorHex,
            CAST(t.complianceStatus as string),
            COALESCE(AVG(th.avgThicknessMm), 0),
            COALESCE(MIN(th.minThicknessMm), 0)
        )
        FROM ThicknessHistory th
        JOIN th.tank t
        JOIN t.riskCategory rc
        JOIN t.productService ps
        GROUP BY
            t.tankId,
            ps.name,
            rc.label,
            rc.colorHex,
            t.complianceStatus
        ORDER BY
            MIN(th.minThicknessMm) ASC
    """)
    List<HeatmapTankResponse> getHeatmapTanks();

// Add this to ThicknessHistoryRepository.java

    @Query("""
    SELECT new com.tims.dto.response.ThicknessTrendResponse(
        th.measurementYear,
        AVG(th.avgThicknessMm)
    )
    FROM ThicknessHistory th
    WHERE th.tank.tankId = :tankId
    GROUP BY th.measurementYear
    ORDER BY th.measurementYear ASC
""")
    List<ThicknessTrendResponse> getThicknessTrendByTankId(@Param("tankId") String tankId);
}

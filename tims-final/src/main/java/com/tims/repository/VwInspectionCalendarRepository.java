package com.tims.repository;
import com.tims.entity.view.VwInspectionCalendar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
@Repository
public interface VwInspectionCalendarRepository extends JpaRepository<VwInspectionCalendar,Integer> {
    @Query("""
SELECT v
FROM VwInspectionCalendar v
WHERE v.plannedDate BETWEEN :fromDate AND :toDate
""")
    List<VwInspectionCalendar> findByDateRange(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );
    List<VwInspectionCalendar> findByTankId(String tankId);
}

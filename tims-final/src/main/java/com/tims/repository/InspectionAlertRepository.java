package com.tims.repository;
import com.tims.entity.InspectionAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InspectionAlertRepository extends JpaRepository<InspectionAlert,Integer> {
    Page<InspectionAlert> findByAssignedToIdAndReadFalseOrderByCreatedAtDesc(Short assignedToId, Pageable pageable);

    @Query("""
    SELECT a FROM InspectionAlert a
    WHERE a.read = false
    ORDER BY a.createdAt DESC
""")

    Page<InspectionAlert> findByReadFalseOrderByCreatedAtDesc(Pageable pageable);
    boolean existsByInspectionIdAndAlertType(Integer inspectionId, InspectionAlert.AlertType alertType);

    @Query("""
        SELECT ia
        FROM InspectionAlert ia
        WHERE ia.alertType = 'CONFLICT'
        AND (:unreadOnly = false OR ia.read = false)
        ORDER BY ia.createdAt DESC
    """)
    List<InspectionAlert> findConflictAlerts(boolean unreadOnly);
    Page<InspectionAlert> findByAssignedToIdAndReadFalseOrderByCreatedAtDesc(
            Long userId,
            Pageable pageable
    );

}

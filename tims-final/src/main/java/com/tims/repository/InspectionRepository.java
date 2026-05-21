package com.tims.repository;
import com.tims.entity.Inspection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;


@Repository
public interface InspectionRepository
        extends JpaRepository<Inspection, Integer> {

    List<Inspection> findByStatusOrderByPlannedDateAsc(
            Inspection.Status status
    );

    @Query("""
        SELECT COUNT(i)
        FROM Inspection i
        WHERE i.status='PLANNED'
        AND i.plannedDate < CURRENT_DATE
    """)
    long countOverdue();

    @Query("""
        SELECT i
        FROM Inspection i
        WHERE i.status IN ('PLANNED','IN_PROGRESS')
        AND i.plannedDate <= :dueDate
        ORDER BY i.plannedDate ASC
    """)
    List<Inspection> findDueBy(
            @org.springframework.data.repository.query.Param("dueDate")
            LocalDate dueDate
    );

    Optional<Inspection> findTopByTankIdOrderByCreatedAtDesc(
            Short tankId
    );

    Page<Inspection> findByTankIdOrderByCreatedAtDescIdDesc(
            Short tankId,
            Pageable pageable
    );

    @Query("""
SELECT i FROM Inspection i
LEFT JOIN FETCH i.scopeItems
WHERE i.id = :id
""")
    Optional<Inspection> findByIdWithScopeItems(@Param("id") Integer id);
    @Query("""
SELECT i FROM Inspection i
JOIN FETCH i.tank t
JOIN FETCH t.site
JOIN FETCH t.riskCategory
JOIN FETCH i.standard
JOIN FETCH i.inspectionType
JOIN FETCH i.inspector
WHERE i.id = :id
""")
    Optional<Inspection> findWorkPackRoot(@Param("id") Integer id);
}

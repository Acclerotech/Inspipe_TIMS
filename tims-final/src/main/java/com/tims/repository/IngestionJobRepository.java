package com.tims.repository;
import com.tims.entity.IngestionJob;
import com.tims.entity.Inspection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository

public interface IngestionJobRepository
        extends JpaRepository<IngestionJob, Integer> {

    Page<IngestionJob> findByTankId(
            Short tankId,
            Pageable pageable
    );

    @Query("""
        SELECT j
        FROM IngestionJob j
        WHERE j.tank.tankId=:tankId
        AND j.status=:status
        ORDER BY j.uploadDate ASC
    """)
    List<IngestionJob> findByTankIdAndStatusOrderByUploadDateAsc(
            @Param("tankId") String tankId,
            @Param("status") IngestionJob.Status status
    );

    @Query("""
        SELECT j
        FROM IngestionJob j
        WHERE j.tank.id=:tankId
        ORDER BY j.uploadDate DESC
    """)
    Page<IngestionJob> findByTankIdOrderByUploadDateDesc(
            @Param("tankId") Short tankId,
            Pageable pageable
    );

    Optional<IngestionJob>
    findTopByInspectionIdOrderByCommittedAtDesc(
            Integer inspectionId
    );

    Optional<IngestionJob>
    findTopByInspectionIdAndTankIdOrderByCommittedAtDesc(
            Integer inspectionId,
            Short tankId
    );
}
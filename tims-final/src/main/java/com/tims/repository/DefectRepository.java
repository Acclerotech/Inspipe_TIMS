package com.tims.repository;
import com.tims.entity.Defect;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface DefectRepository extends JpaRepository<Defect,Integer> {
    Page<Defect> findByTankId(Short tankId, Pageable pageable);
    Optional<Defect> findByDefectCode(String defectCode);
    boolean existsByDefectCode(String defectCode);
    @Query("SELECT COUNT(d) FROM Defect d WHERE d.status='OPEN'") long countAllOpen();
    @Query("SELECT COUNT(d) FROM Defect d WHERE d.tank.id=:tankId AND d.status='OPEN'") long countOpenByTankId(@Param("tankId") Short tankId);
    List<Defect> findByLinkedJobId(Integer jobId);
    @Query("""
SELECT d FROM Defect d
JOIN d.defectClass dc
WHERE d.tank.tankId = :tankId
ORDER BY dc.classNum ASC
""")
    Page<Defect> findOpenByTankIdSorted(
            @Param("tankId") String tankId,
            Pageable pageable
    );
    // Needed by DefectService
    Page<Defect> findByStatus(Defect.Status status, Pageable pageable);
}

package com.tims.repository;
import com.tims.entity.UtReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface UtReadingRepository extends JpaRepository<UtReading,Long> {
    List<UtReading> findByTank_TankIdOrderByMeasuredAtAsc(String tankId);
    List<UtReading> findByJobIdAndBelowRetirementTrue(Integer jobId);
    List<UtReading> findByJobId(Integer jobId);
    @Query(value="SELECT COUNT(*) FROM (SELECT tank_id,shell_course,angle_deg,COUNT(*) as cnt FROM ut_readings WHERE job_id=:jobId GROUP BY tank_id,shell_course,angle_deg HAVING cnt>1) dups", nativeQuery=true)
    long countDuplicateReadingsByJobId(@Param("jobId") Integer jobId);
}

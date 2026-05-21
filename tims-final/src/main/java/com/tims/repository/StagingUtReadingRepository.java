package com.tims.repository;

import com.tims.entity.StagingUtReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StagingUtReadingRepository extends JpaRepository<StagingUtReading, Long> {

    List<StagingUtReading> findByJobId(Integer jobId);

    List<StagingUtReading> findByJobIdAndBelowRetirementTrue(Integer jobId);

    @Query("SELECT COUNT(s) FROM StagingUtReading s WHERE s.jobId = :jobId " +
            "GROUP BY s.shellCourse, s.angleDeg HAVING COUNT(s) > 1")
    List<Long> findDuplicates(@Param("jobId") Integer jobId);

    default long countDuplicateReadingsByJobId(Integer jobId) {
        return findDuplicates(jobId).stream().mapToLong(Long::longValue).sum();
    }

    void deleteByJobId(Integer jobId);
}
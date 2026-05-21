package com.tims.repository;
import com.tims.entity.MflReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface MflReadingRepository extends JpaRepository<MflReading,Long> {
    List<MflReading> findByJobId(Integer jobId);
    List<MflReading> findByTankId(Short tankId);
}

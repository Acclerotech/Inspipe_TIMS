package com.tims.repository;
import com.tims.entity.IngestionColumnMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface IngestionColumnMappingRepository extends JpaRepository<IngestionColumnMapping,Integer> {
    List<IngestionColumnMapping> findByJobId(Integer jobId);
    void deleteByJobId(Integer jobId);
}

package com.tims.repository;
import com.tims.entity.RawFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface RawFileRepository extends JpaRepository<RawFile,Integer> {
    Optional<RawFile> findByJobId(Integer jobId);
    boolean existsBySha256Hex(String sha256Hex);
}

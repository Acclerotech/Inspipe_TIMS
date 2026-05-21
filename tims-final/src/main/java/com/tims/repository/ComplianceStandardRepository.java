package com.tims.repository;
import com.tims.entity.ComplianceStandard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository public interface ComplianceStandardRepository extends JpaRepository<ComplianceStandard,Short> {

    Optional<ComplianceStandard> findById(Integer standardId);


}

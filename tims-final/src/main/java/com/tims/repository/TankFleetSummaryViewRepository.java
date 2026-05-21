package com.tims.repository;

import com.tims.entity.view.VwTankFleetSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.*;

public interface TankFleetSummaryViewRepository extends JpaRepository<VwTankFleetSummary, String> {
    Page<VwTankFleetSummary> findAll(Pageable pageable);
}

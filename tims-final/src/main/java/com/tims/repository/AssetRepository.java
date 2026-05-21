package com.tims.repository;

import com.tims.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Integer> {

    /** Find Asset by the business Tank ID string (e.g. "T-101"). */
    @Query("SELECT a FROM Asset a JOIN a.tank t WHERE t.tankId = :tankId")
    Optional<Asset> findByTankId(String tankId);

    /** Check whether an asset record already exists for a given tanks.id PK. */
    boolean existsByTankId(Short tankId);
}

package com.tims.repository;
import com.tims.entity.CorrosionOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;
@Repository
public interface CorrosionOverrideRepository extends JpaRepository<CorrosionOverride,Integer> {

    @Query("SELECT co FROM CorrosionOverride co WHERE co.tank.id=:tankId AND co.active=true")
    Optional<CorrosionOverride> findActiveByTankId(@Param("tankId") Short tankId);

    @Query("""
    SELECT co
    FROM CorrosionOverride co
    WHERE co.tank.tankId = :tankId
      AND co.active = true
    ORDER BY co.id DESC
""")
    Optional<CorrosionOverride> findActiveByTankId(
            @Param("tankId") String tankId
    );

    Optional<CorrosionOverride> findFirstByTankIdAndActiveTrueOrderByOverriddenAtDesc(Short tankId);

}

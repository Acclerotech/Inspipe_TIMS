package com.tims.repository;
import com.tims.entity.CorrosionOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface CorrosionOverrideRepository extends JpaRepository<CorrosionOverride,Integer> {
    @Query("SELECT co FROM CorrosionOverride co WHERE co.tank.id=:tankId AND co.active=true")
    Optional<CorrosionOverride> findActiveByTankId(@Param("tankId") Short tankId);

    Optional<CorrosionOverride> findFirstByTankIdAndActiveTrueOrderByOverriddenAtDesc(Short tankId);

}

package com.tims.repository;


import java.util.List;
import com.tims.entity.ActivityFeed;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ActivityFeedRepository extends JpaRepository<ActivityFeed, Integer> {

    Page<ActivityFeed> findAllByOrderByOccurredAtDesc(Pageable pageable);

    Page<ActivityFeed> findByTankIdOrderByOccurredAtDesc(Short tankId, Pageable pageable);

    long countByActivityType(ActivityFeed.ActivityType type);

    List<ActivityFeed> findDistinctByActivityTypeIsNotNull();
}

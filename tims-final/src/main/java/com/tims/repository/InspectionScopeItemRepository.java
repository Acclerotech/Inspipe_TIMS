package com.tims.repository;

import com.tims.entity.InspectionScopeItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InspectionScopeItemRepository
        extends JpaRepository<InspectionScopeItem, Long> {

    List<InspectionScopeItem> findByInspectionId(Integer inspectionId);
}
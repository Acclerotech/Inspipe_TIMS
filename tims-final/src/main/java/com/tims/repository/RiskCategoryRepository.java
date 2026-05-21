package com.tims.repository;

import com.tims.entity.RiskCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RiskCategoryRepository extends JpaRepository<RiskCategory, Long> {

}

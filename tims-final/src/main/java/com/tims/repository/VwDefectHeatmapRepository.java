package com.tims.repository;
import com.tims.entity.view.VwDefectHeatmap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface VwDefectHeatmapRepository extends JpaRepository<VwDefectHeatmap,String> {
    List<VwDefectHeatmap> findByTankId(String tankId);
    Page<VwDefectHeatmap> findByStatus(String status, Pageable pageable);
}

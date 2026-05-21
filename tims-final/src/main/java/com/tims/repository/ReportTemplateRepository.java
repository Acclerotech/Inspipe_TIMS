package com.tims.repository;
import com.tims.entity.ReportTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
@Repository public interface ReportTemplateRepository extends JpaRepository<ReportTemplate,Byte> {}

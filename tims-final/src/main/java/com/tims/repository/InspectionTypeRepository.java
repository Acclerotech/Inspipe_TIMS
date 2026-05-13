package com.tims.repository;
import com.tims.entity.InspectionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
@Repository public interface InspectionTypeRepository extends JpaRepository<InspectionType,Byte> {}

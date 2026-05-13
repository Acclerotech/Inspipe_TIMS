package com.tims.repository;
import com.tims.entity.DefectClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface DefectClassRepository extends JpaRepository<DefectClass,Byte> {
    Optional<DefectClass> findByClassNum(byte classNum);
}

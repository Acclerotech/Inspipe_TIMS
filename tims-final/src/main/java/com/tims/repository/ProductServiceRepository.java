package com.tims.repository;

import com.tims.entity.ProductService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductServiceRepository extends JpaRepository<ProductService, Long> {
    Optional<ProductService> findByName(String name);
}

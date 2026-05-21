package com.tims.repository;
import com.tims.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
@Repository
public interface UserRepository extends JpaRepository<User,Short> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    List<User> findByRoleIn(List<User.Role> roles);
    Optional<User> findById(Integer id);

    List<User> findByRole(User.Role role);
}

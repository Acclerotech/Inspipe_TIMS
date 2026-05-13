package com.tims.audit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent,Long> {
    List<AuditEvent> findByEntityTypeAndEntityIdOrderByOccurredAtDesc(String entityType, String entityId);
    Page<AuditEvent> findByEntityTypeAndEntityId(String entityType, String entityId, Pageable pageable);
    Page<AuditEvent> findByUserId(Short userId, Pageable pageable);
}

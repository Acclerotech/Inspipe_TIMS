package com.tims.audit;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tims.entity.User;
import com.tims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
@Slf4j @Service @RequiredArgsConstructor
public class AuditService {
    private final AuditEventRepository auditRepo;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public void record(String entityType, String entityId, AuditEvent.Action action, Object before, Object after, String reason) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String email = (auth!=null) ? auth.getName() : "system";
        Short userId = userRepository.findByEmail(email).map(User::getId).orElse((short)0);
        var event = AuditEvent.builder().entityType(entityType).entityId(entityId).action(action)
            .beforeState(serialize(before)).afterState(serialize(after)).userId(userId).userEmail(email).reason(reason).build();
        auditRepo.save(event);
        log.info("[AUDIT] {}.{} id={} user={}",action,entityType,entityId,email);
    }
    public void record(String entityType, String entityId, AuditEvent.Action action, Object before, Object after) {
        record(entityType,entityId,action,before,after,null);
    }
    private String serialize(Object obj) {
        if (obj == null) return null;

        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.error("Audit serialize failed: {}", e.getMessage());
            return "{\"error\":\"serialization_failed\"}";
        }
    }
}

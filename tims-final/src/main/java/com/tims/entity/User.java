package com.tims.entity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
@Entity @Table(name="users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User implements UserDetails {
    public enum Role { INTEGRITY_ENGINEER, INSPECTOR, INTEGRITY_MANAGER, ADMIN }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Short id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="org_id",nullable=false) private Organisation organisation;
    @Column(name="employee_id",nullable=false,unique=true,length=20) private String employeeId;
    @Column(name="full_name",nullable=false,length=80) private String fullName;
    @Column(nullable=false,unique=true,length=120) private String email;
//    @Column(name="password_hash",length=255) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private Role role;
    @Column(name="is_eemua_certified",nullable=false) private boolean eemuaCertified;
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { if(createdAt==null) createdAt=LocalDateTime.now(); }
    @Override public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_"+role.name()));
    }
    @Override public String getPassword() { return null; }
    @Override public String getUsername() { return email; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}

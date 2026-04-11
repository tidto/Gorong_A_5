package com.gorong.backend.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users") // PostgreSQL에 생성될 실제 테이블 이름
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 기본 규칙 (빈 생성자 필요)
public class User {

    @Id // PK 지정
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 오라클의 SEQUENCE.NEXTVAL과 동일한 역할
    @Column(name = "user_id")
    private Long id;

    @Column(name = "firebase_uid", unique = true, nullable = false, length = 128)
    private String firebaseUid;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "role_type", length = 20)
    private String roleType = "USER";

    @Column(name = "is_barrier_free")
    private Boolean isBarrierFree = false;

    @CreationTimestamp // INSERT 시 자동으로 현재 시간 저장 (오라클의 SYSDATE)
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp // UPDATE 시 자동으로 갱신
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public User(String firebaseUid, String email, String roleType, Boolean isBarrierFree) {
        this.firebaseUid = firebaseUid;
        this.email = email;
        this.roleType = roleType != null ? roleType : "USER";
        this.isBarrierFree = isBarrierFree != null ? isBarrierFree : false;
    }
}
package com.gorong.backend.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.OffsetDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(name = "firebase_uid", nullable = false, unique = true, columnDefinition = "TEXT")
    private String firebaseUid;

    @Column(name = "email", nullable = false, columnDefinition = "TEXT")
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_type", nullable = false, columnDefinition = "TEXT")
    private RoleType roleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "barrier_free_type", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private BarrierFreeType barrierFreeType = BarrierFreeType.NONE;

    @Column(name = "is_foreigner", nullable = false)
    @Builder.Default
    private Boolean isForeigner = false;

    @CreationTimestamp
    @Column(name = "create_at", nullable = false, updatable = false)
    private OffsetDateTime createAt;

    @UpdateTimestamp
    @Column(name = "update_at")
    private OffsetDateTime updateAt;

    // --- Enums ---
    public enum RoleType { USER, ADMIN }
    public enum BarrierFreeType { NONE, PHYSICAL, VISUAL, AUDITORY }
}
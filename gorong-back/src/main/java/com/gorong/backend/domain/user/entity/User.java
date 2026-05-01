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

    // 💡 [추가된 부분 1] 프론트에서 넘어온 닉네임을 저장할 공간
    @Column(name = "nickname", nullable = false, length = 50)
    private String nickname;

    // 💡 [추가된 부분 2] 프론트에서 넘어온 고롱 주파수를 저장할 공간
    @Column(name = "gorong_hz", length = 20)
    private String gorongHz;

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
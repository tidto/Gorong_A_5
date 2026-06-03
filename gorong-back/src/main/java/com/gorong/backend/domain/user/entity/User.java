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

    public enum AccountStatus {
        ACTIVE,
        INACTIVE
    }

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

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private AccountStatus accountStatus = AccountStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public void updateProfile(BarrierFreeType barrierFreeType, Boolean isForeigner) {
        if (barrierFreeType != null) this.barrierFreeType = barrierFreeType;
        if (isForeigner != null) this.isForeigner = isForeigner;
    }

    public void deactivate() {
        this.accountStatus = AccountStatus.INACTIVE;
    }

    public void activate() {
        this.accountStatus = AccountStatus.ACTIVE;
    }

    public AccountStatus getResolvedAccountStatus() {
        return accountStatus == null ? AccountStatus.ACTIVE : accountStatus;
    }

    // --- Enums ---
    public enum RoleType { USER, ADMIN }
    public enum BarrierFreeType { NONE, PHYSICAL, VISUAL, AUDITORY }
}

package com.gorong.backend.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.OffsetDateTime;

@Entity
@Table(name = "user_ban")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class UserBan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ban_id")
    private Long banId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "email", nullable = false, columnDefinition = "TEXT")
    private String email;

    @Column(name = "firebase_uid", nullable = false, columnDefinition = "TEXT")
    private String firebaseUid;

    @Column(name = "ban_reason", columnDefinition = "TEXT")
    private String banReason;

    @CreationTimestamp
    @Column(name = "banned_at", nullable = false, updatable = false)
    private OffsetDateTime bannedAt;

    @Column(name = "permanent_delete_at", nullable = false)
    private OffsetDateTime permanentDeleteAt;
}
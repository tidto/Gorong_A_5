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

    public enum BanStatus {
        ACTIVE, RELEASED, EXPIRED
    }

    public enum AppealStatus {
        NONE, SUBMITTED, REVIEWING, RESOLVED
    }

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

    @Column(name = "ban_days", nullable = false)
    private Integer banDays;

    @CreationTimestamp
    @Column(name = "banned_at", nullable = false, updatable = false)
    private OffsetDateTime bannedAt;

    @Column(name = "ban_ends_at")
    private OffsetDateTime banEndsAt;

    @Column(name = "permanent_delete_at")
    private OffsetDateTime permanentDeleteAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "ban_status", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private BanStatus banStatus = BanStatus.ACTIVE;

    @Column(name = "appeal_text", columnDefinition = "TEXT")
    private String appealText;

    @Enumerated(EnumType.STRING)
    @Column(name = "appeal_status", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private AppealStatus appealStatus = AppealStatus.NONE;

    @Column(name = "appeal_submitted_at")
    private OffsetDateTime appealSubmittedAt;

    @Column(name = "appeal_review_note", columnDefinition = "TEXT")
    private String appealReviewNote;

    @Column(name = "appeal_reviewed_at")
    private OffsetDateTime appealReviewedAt;

    public boolean isPermanent() {
        return banDays != null && banDays == 0;
    }

    public void submitAppeal(String appealText) {
        if (appealStatus != AppealStatus.NONE) {
            throw new IllegalStateException("반론은 1회만 가능합니다.");
        }
        this.appealText = appealText;
        this.appealStatus = AppealStatus.SUBMITTED;
        this.appealSubmittedAt = OffsetDateTime.now();
    }

    public void markAppealReviewing() {
        if (appealStatus != AppealStatus.SUBMITTED) {
            throw new IllegalStateException("접수된 반론이 없습니다.");
        }
        this.appealStatus = AppealStatus.REVIEWING;
    }

    public void resolveAppeal(String note) {
        this.appealStatus = AppealStatus.RESOLVED;
        this.appealReviewNote = note;
        this.appealReviewedAt = OffsetDateTime.now();
    }

    public void release() {
        this.banStatus = BanStatus.RELEASED;
        this.permanentDeleteAt = null;
    }

    public void expire() {
        this.banStatus = BanStatus.EXPIRED;
    }
}
